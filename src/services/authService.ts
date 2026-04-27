/** Purpose: Handle email/password auth plus email-OTP verification across Firebase and explicit demo fallback. */
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "@react-native-firebase/auth";
import type { FirebaseAuthTypes } from "@react-native-firebase/auth";
import { httpsCallable } from "@react-native-firebase/functions";

import { resolveActiveFirebaseClientMode } from "@/config/backendRuntime";
import { hasFirebaseApp, firebaseFunctions } from "@/services/firebase";
import { normalizeDisplayName, normalizeEmail, sanitizeOtpCode } from "@/utils/input";

const MOCK_AUTH_STORAGE_KEY = "@sosync/mock-auth";

type OtpResponse = {
  resendAvailableAt: string;
  sentAt: string;
};

type VerifyOtpResponse = {
  verifiedAt: string;
};

type PasswordResetResponse = {
  sentAt: string;
};

export type AuthIdentity = {
  uid: string;
  email?: string | null;
  emailVerified?: boolean;
  phoneNumber?: string | null;
  displayName?: string | null;
  photoURL?: string | null;
};

type AuthListener = (user: AuthIdentity | null) => void;

let mockUser: AuthIdentity | null = null;
let pendingVerificationEmail = "";
const listeners = new Set<AuthListener>();
const authInstance = () => getAuth();
const AUTH_SESSION_SETTLE_MS = 250;
const AUTH_SESSION_READY_ATTEMPTS = 10;

const toAuthIdentity = (user: FirebaseAuthTypes.User): AuthIdentity => ({
  uid: user.uid,
  email: user.email,
  emailVerified: user.emailVerified,
  phoneNumber: user.phoneNumber,
  displayName: user.displayName,
  photoURL: user.photoURL,
});

const extractAuthCode = (error: unknown) => {
  if (!error || typeof error !== "object") {
    return "";
  }

  const candidate = "code" in error ? error.code : "";
  return typeof candidate === "string" ? candidate : "";
};

const extractAuthMessage = (error: unknown) => {
  if (!error || typeof error !== "object") {
    return "";
  }

  const candidate = "message" in error ? error.message : "";
  return typeof candidate === "string" ? candidate : "";
};

const toFriendlyAuthError = (error: unknown) => {
  const code = extractAuthCode(error);
  const message = extractAuthMessage(error);

  if (code === "auth/invalid-verification-code" || code === "functions/permission-denied") {
    return new Error("That verification code is not valid. Enter the latest 6-digit code from your email.");
  }

  if (code === "auth/code-expired" || code === "functions/deadline-exceeded") {
    return new Error("That verification code expired. Request a new one and try again.");
  }

  if (code === "functions/resource-exhausted") {
    return new Error(message || "Wait before requesting another verification code.");
  }

  if (code === "auth/invalid-phone-number") {
    return new Error("Enter a valid phone number in international format.");
  }

  if (code === "auth/email-already-in-use") {
    return new Error("That email is already in use. Sign in instead.");
  }

  if (code === "auth/user-not-found" || code === "auth/invalid-credential") {
    return new Error("Incorrect email or password.");
  }

  if (code === "auth/wrong-password") {
    return new Error("Your current password is incorrect.");
  }

  if (code === "auth/weak-password") {
    return new Error("Use a stronger password with at least 8 characters.");
  }

  if (code === "auth/requires-recent-login") {
    return new Error("For security, sign in again before changing this account detail.");
  }

  if (code === "auth/too-many-requests") {
    return new Error("Too many attempts. Wait a moment and try again.");
  }

  return error instanceof Error ? error : new Error("Authentication request failed.");
};

const getClientMode = () => resolveActiveFirebaseClientMode(hasFirebaseApp());

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const ensureFirebaseSession = async (user: FirebaseAuthTypes.User) => {
  await user.getIdToken(true);

  for (let attempt = 0; attempt < AUTH_SESSION_READY_ATTEMPTS; attempt += 1) {
    if (authInstance().currentUser?.uid === user.uid) {
      break;
    }

    await wait(AUTH_SESSION_SETTLE_MS);
  }

  await wait(AUTH_SESSION_SETTLE_MS);
};

const callVerificationFunction = async <RequestData extends object, ResponseData>(
  name: "sendEmailOtp" | "sendPasswordReset" | "verifyEmailOtp",
  payload: RequestData,
) => {
  const callable = httpsCallable<RequestData, ResponseData>(firebaseFunctions(), name, { timeout: 12_000 });
  const result = await callable(payload);
  return result.data;
};

const emitMockUser = async (user: AuthIdentity | null) => {
  mockUser = user;

  if (user) {
    await AsyncStorage.setItem(MOCK_AUTH_STORAGE_KEY, JSON.stringify(user));
  } else {
    await AsyncStorage.removeItem(MOCK_AUTH_STORAGE_KEY);
  }

  listeners.forEach((listener) => listener(user));
};

const hydrateMockUser = async () => {
  if (mockUser) {
    return mockUser;
  }

  const stored = await AsyncStorage.getItem(MOCK_AUTH_STORAGE_KEY);
  mockUser = stored ? (JSON.parse(stored) as AuthIdentity) : null;
  return mockUser;
};

export const authService = {
  subscribe(listener: AuthListener) {
    if (getClientMode() === "firebase") {
      return onAuthStateChanged(authInstance(), (user) => listener(user ? toAuthIdentity(user) : null));
    }

    let active = true;
    listeners.add(listener);
    hydrateMockUser().then((user) => {
      if (active) {
        listener(user);
      }
    });

    return () => {
      active = false;
      listeners.delete(listener);
    };
  },

  getPendingVerificationEmail() {
    if (pendingVerificationEmail) {
      return pendingVerificationEmail;
    }

    if (getClientMode() === "firebase") {
      const currentUser = authInstance().currentUser;
      if (currentUser?.email && !currentUser.emailVerified) {
        return currentUser.email;
      }
      return "";
    }

    return mockUser?.email ?? "";
  },

  getCurrentUserIdentity() {
    if (getClientMode() === "firebase") {
      const currentUser = authInstance().currentUser;
      return currentUser ? toAuthIdentity(currentUser) : null;
    }

    return mockUser;
  },

  async signInWithEmail(email: string, password: string) {
    const normalizedEmail = normalizeEmail(email);

    if (getClientMode() === "firebase") {
      try {
        const credential = await signInWithEmailAndPassword(authInstance(), normalizedEmail, password);
        await ensureFirebaseSession(credential.user);
        pendingVerificationEmail = credential.user.email && !credential.user.emailVerified ? credential.user.email : "";
        return toAuthIdentity(credential.user);
      } catch (error) {
        throw toFriendlyAuthError(error);
      }
    }

    const user = {
      uid: "demo-user",
      email: normalizedEmail,
      emailVerified: true,
      displayName: "Demo Responder",
    } satisfies AuthIdentity;
    await emitMockUser(user);
    pendingVerificationEmail = "";
    return user;
  },

  async signUpWithEmail(name: string, email: string, password: string) {
    const normalizedName = normalizeDisplayName(name);
    const normalizedEmail = normalizeEmail(email);

    if (getClientMode() === "firebase") {
      try {
        const credential = await createUserWithEmailAndPassword(authInstance(), normalizedEmail, password);
        await updateProfile(credential.user, { displayName: normalizedName });
        await ensureFirebaseSession(credential.user);
        pendingVerificationEmail = credential.user.email ?? normalizedEmail;
        return { ...toAuthIdentity(credential.user), displayName: normalizedName, emailVerified: false };
      } catch (error) {
        throw toFriendlyAuthError(error);
      }
    }

    const user = {
      uid: "demo-user",
      email: normalizedEmail,
      emailVerified: false,
      displayName: normalizedName,
    } satisfies AuthIdentity;
    await emitMockUser(user);
    pendingVerificationEmail = normalizedEmail;
    return user;
  },

  async sendPasswordReset(email: string) {
    const normalizedEmail = normalizeEmail(email);

    if (getClientMode() !== "firebase") {
      return;
    }

    try {
      await callVerificationFunction<{ email: string }, PasswordResetResponse>("sendPasswordReset", {
        email: normalizedEmail,
      });
    } catch (error) {
      const code = extractAuthCode(error);
      if (code === "functions/invalid-argument") {
        throw new Error(extractAuthMessage(error) || "Enter a valid email address.");
      }

      throw new Error("We couldn't send a reset email right now. Try again in a moment.");
    }
  },

  async sendEmailOtp() {
    if (getClientMode() !== "firebase") {
      return {
        resendAvailableAt: new Date(Date.now() + 60_000).toISOString(),
        sentAt: new Date().toISOString(),
      } satisfies OtpResponse;
    }

    const currentUser = authInstance().currentUser;
    if (!currentUser?.email) {
      throw new Error("Sign in before requesting an email verification code.");
    }

    if (currentUser.emailVerified) {
      pendingVerificationEmail = "";
      throw new Error("This email is already verified.");
    }

    try {
      await ensureFirebaseSession(currentUser);
      const response = await callVerificationFunction<Record<string, never>, OtpResponse>("sendEmailOtp", {});
      pendingVerificationEmail = currentUser.email;
      return response;
    } catch (error) {
      throw toFriendlyAuthError(error);
    }
  },

  async resendEmailOtp() {
    return this.sendEmailOtp();
  },

  async verifyEmailOtp(code: string) {
    const sanitizedCode = sanitizeOtpCode(code);

    if (getClientMode() !== "firebase") {
      if (sanitizedCode !== "111111") {
        throw new Error("Use 111111 while running in demo mode.");
      }

      const nextUser = {
        ...(mockUser ?? {
          uid: "demo-user",
          email: pendingVerificationEmail || "responder@sosync.app",
          displayName: "Demo Responder",
        }),
        emailVerified: true,
      } satisfies AuthIdentity;
      await emitMockUser(nextUser);
      pendingVerificationEmail = "";
      return nextUser;
    }

    try {
      await callVerificationFunction<{ code: string }, VerifyOtpResponse>("verifyEmailOtp", { code: sanitizedCode });
      const currentUser = authInstance().currentUser;
      if (!currentUser) {
        throw new Error("Your session expired. Sign in again to finish verifying your email.");
      }

      await currentUser.reload();
      const refreshedUser = authInstance().currentUser;
      if (!refreshedUser) {
        throw new Error("Your session expired. Sign in again to finish verifying your email.");
      }

      pendingVerificationEmail = "";
      return { ...toAuthIdentity(refreshedUser), emailVerified: true };
    } catch (error) {
      throw toFriendlyAuthError(error);
    }
  },

  async signOut() {
    pendingVerificationEmail = "";

    if (getClientMode() === "firebase") {
      if (!authInstance().currentUser) {
        return;
      }

      try {
        await signOut(authInstance());
      } catch (error) {
        if (extractAuthCode(error) === "auth/no-current-user") {
          return;
        }

        throw toFriendlyAuthError(error);
      }
      return;
    }

    await emitMockUser(null);
  },

  async updatePassword(currentPassword: string, nextPassword: string) {
    if (getClientMode() !== "firebase") {
      return;
    }

    const currentUser = authInstance().currentUser;
    if (!currentUser?.email) {
      throw new Error("Password changes are only available for email accounts.");
    }

    try {
      const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
      await currentUser.reauthenticateWithCredential(credential);
      await currentUser.updatePassword(nextPassword);
    } catch (error) {
      throw toFriendlyAuthError(error);
    }
  },

  async deleteAccount(currentPassword?: string) {
    if (getClientMode() !== "firebase") {
      await emitMockUser(null);
      return;
    }

    const currentUser = authInstance().currentUser;
    if (!currentUser) {
      return;
    }

    try {
      if (currentUser.email && currentPassword) {
        const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
        await currentUser.reauthenticateWithCredential(credential);
      }

      await currentUser.delete();
    } catch (error) {
      throw toFriendlyAuthError(error);
    }
  },
};
