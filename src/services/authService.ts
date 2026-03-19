/** Purpose: Handle auth state, email sign-in, and phone OTP across Firebase and demo fallback. */
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { FirebaseAuthTypes } from "@react-native-firebase/auth";

import { firebaseAuth, hasFirebaseApp } from "@/services/firebase";

const MOCK_AUTH_STORAGE_KEY = "@sosync/mock-auth";

export type AuthIdentity = {
  uid: string;
  email?: string | null;
  phoneNumber?: string | null;
  displayName?: string | null;
};

type AuthListener = (user: AuthIdentity | null) => void;

let mockUser: AuthIdentity | null = null;
let pendingPhoneNumber = "";
let pendingPhoneConfirmation: FirebaseAuthTypes.ConfirmationResult | null = null;
const listeners = new Set<AuthListener>();

const toAuthIdentity = (user: FirebaseAuthTypes.User): AuthIdentity => ({
  uid: user.uid,
  email: user.email,
  phoneNumber: user.phoneNumber,
  displayName: user.displayName,
});

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
    if (hasFirebaseApp()) {
      return firebaseAuth().onAuthStateChanged((user) => listener(user ? toAuthIdentity(user) : null));
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

  getPendingPhoneNumber() {
    return pendingPhoneNumber;
  },

  async signInWithEmail(email: string, password: string) {
    if (hasFirebaseApp()) {
      const credential = await firebaseAuth().signInWithEmailAndPassword(email, password);
      return toAuthIdentity(credential.user);
    }

    const user = { uid: "demo-user", email, displayName: "Demo Responder" };
    await emitMockUser(user);
    return user;
  },

  async signUpWithEmail(name: string, email: string, password: string) {
    if (hasFirebaseApp()) {
      const credential = await firebaseAuth().createUserWithEmailAndPassword(email, password);
      await credential.user.updateProfile({ displayName: name });
      return toAuthIdentity({ ...credential.user, displayName: name } as FirebaseAuthTypes.User);
    }

    const user = { uid: "demo-user", email, displayName: name };
    await emitMockUser(user);
    return user;
  },

  async startPhoneSignIn(phoneNumber: string) {
    pendingPhoneNumber = phoneNumber;

    if (hasFirebaseApp()) {
      pendingPhoneConfirmation = await firebaseAuth().signInWithPhoneNumber(phoneNumber);
      return;
    }
  },

  async confirmPhoneCode(code: string) {
    if (hasFirebaseApp()) {
      if (!pendingPhoneConfirmation) {
        throw new Error("Start phone verification before entering a code.");
      }

      const credential = await pendingPhoneConfirmation.confirm(code);
      pendingPhoneConfirmation = null;
      if (!credential?.user) {
        throw new Error("Verification completed without an authenticated user.");
      }
      return toAuthIdentity(credential.user);
    }

    if (code !== "111111") {
      throw new Error("Use 111111 while running in demo mode.");
    }

    const user = {
      uid: "demo-user",
      phoneNumber: pendingPhoneNumber,
      displayName: "Demo Responder",
    };
    await emitMockUser(user);
    return user;
  },

  async signOut() {
    pendingPhoneNumber = "";
    pendingPhoneConfirmation = null;

    if (hasFirebaseApp()) {
      await firebaseAuth().signOut();
      return;
    }

    await emitMockUser(null);
  },
};
