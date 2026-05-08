jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  removeItem: jest.fn(),
  setItem: jest.fn(),
}));

jest.mock("@react-native-firebase/auth", () => ({
  createUserWithEmailAndPassword: jest.fn(),
  EmailAuthProvider: { credential: jest.fn() },
  getAuth: jest.fn(),
  onAuthStateChanged: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
  updateProfile: jest.fn(),
}));

jest.mock("@react-native-firebase/functions", () => ({
  httpsCallable: jest.fn(),
}));

jest.mock("@/config/backendRuntime", () => ({
  resolveActiveFirebaseClientMode: jest.fn(() => "firebase"),
}));

jest.mock("@/services/firebase", () => ({
  firebaseFunctions: jest.fn(),
  hasFirebaseApp: jest.fn(() => true),
}));

import { toFriendlyAuthError } from "@/services/authService";

describe("toFriendlyAuthError", () => {
  it("maps OTP offline failures to reconnect copy", () => {
    expect(
      toFriendlyAuthError(
        Object.assign(new Error("Network request failed"), { code: "functions/unavailable" }),
        "otp",
      ).message,
    ).toBe("You're offline right now. Reconnect to the internet, then request or verify the code again.");
  });

  it("keeps invalid-code messaging specific", () => {
    expect(
      toFriendlyAuthError(
        Object.assign(new Error("invalid code"), { code: "auth/invalid-verification-code" }),
        "otp",
      ).message,
    ).toBe("That verification code is not valid. Enter the latest 6-digit code from your email.");
  });

  it("maps reset timeouts to clear retry copy", () => {
    expect(
      toFriendlyAuthError(
        Object.assign(new Error("deadline exceeded"), { code: "functions/deadline-exceeded" }),
        "reset",
      ).message,
    ).toBe("Sending the reset email took too long. Check your connection and try again.");
  });
});
