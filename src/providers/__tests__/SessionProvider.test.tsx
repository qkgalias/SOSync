import { act, render, screen, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";

import { SessionProvider, useSessionContext } from "@/providers/SessionProvider";
import type { UserProfile } from "@/types";

const mockDeleteAccountData = jest.fn();
const mockDeleteCurrentToken = jest.fn<Promise<void>, [string]>(() => Promise.resolve());
const mockGetPendingVerificationEmail = jest.fn(() => "");
const mockGetCurrentUserIdentity = jest.fn();
const mockListenToGroups = jest.fn();
const mockListenToProfile = jest.fn();
const mockRegisterDevice = jest.fn<Promise<void>, [string]>(() => Promise.resolve());
const mockSaveProfile = jest.fn();
const mockSyncGroupMemberProfile = jest.fn<Promise<void>, [string, unknown[], UserProfile]>(
  () => Promise.resolve(),
);
const mockTokenRefreshUnsubscribe = jest.fn();

let mockAuthUser: {
  uid: string;
  displayName: string;
  email: string;
  phoneNumber?: string;
  photoURL?: string;
  emailVerified: boolean;
} | null = null;
let latestSession: ReturnType<typeof useSessionContext> | null = null;

jest.mock("@/config/backendRuntime", () => ({
  resolveActiveFirebaseClientMode: jest.fn(() => "firebase"),
}));

jest.mock("@/services/firebase", () => ({
  hasFirebaseApp: jest.fn(() => true),
}));

jest.mock("@/services/authService", () => ({
  authService: {
    subscribe: jest.fn((listener: (user: typeof mockAuthUser) => void) => {
      listener(mockAuthUser);
      return jest.fn();
    }),
    getPendingVerificationEmail: () => mockGetPendingVerificationEmail(),
    getCurrentUserIdentity: () => mockGetCurrentUserIdentity(),
    signInWithEmail: jest.fn(),
    signUpWithEmail: jest.fn(),
    sendPasswordReset: jest.fn(),
    sendEmailOtp: jest.fn(),
    resendEmailOtp: jest.fn(),
    verifyEmailOtp: jest.fn(),
    updatePassword: jest.fn(),
    deleteAccount: jest.fn(),
    signOut: jest.fn(),
  },
}));

jest.mock("@/services/circleService", () => ({
  circleService: {
    createCircle: jest.fn(),
    joinCircleByCode: jest.fn(),
    leaveCircle: jest.fn(),
    removeMember: jest.fn(),
    updateMemberRole: jest.fn(),
    transferOwnership: jest.fn(),
  },
}));

jest.mock("@/services/firestoreService", () => ({
  firestoreService: {
    listenToProfile: (userId: string, callback: (profile: UserProfile | null) => void) =>
      mockListenToProfile(userId, callback),
    listenToGroups: (userId: string, callback: (groups: unknown[]) => void) =>
      mockListenToGroups(userId, callback),
    saveProfile: (profile: UserProfile) => mockSaveProfile(profile),
    syncGroupMemberProfile: (userId: string, groups: unknown[], profile: UserProfile) =>
      mockSyncGroupMemberProfile(userId, groups, profile),
    deleteAccountData: (userId: string, groupIds: string[]) => mockDeleteAccountData(userId, groupIds),
  },
}));

jest.mock("@/services/notificationService", () => ({
  notificationService: {
    registerDevice: (userId: string) => mockRegisterDevice(userId),
    listenToTokenRefresh: jest.fn(() => mockTokenRefreshUnsubscribe),
    deleteCurrentToken: (userId: string) => mockDeleteCurrentToken(userId),
  },
}));

const defaultProfile = (): UserProfile => ({
  userId: "user-1",
  name: "Jake Fr",
  email: "jakefr67@gmail.com",
  phoneNumber: "+638723917319",
  createdAt: "2026-04-27T00:00:00.000Z",
  lastActive: "2026-04-27T00:00:00.000Z",
  onboarding: {
    currentStep: "verify",
    profileComplete: false,
    circleComplete: false,
    permissionsComplete: false,
  },
  preferences: {
    theme: "system",
    disasterAlerts: true,
    sosAlerts: true,
    evacuationAlerts: true,
  },
  privacy: {
    locationSharingEnabled: true,
    shareWhileUsingOnly: true,
    emergencyBroadcastEnabled: true,
  },
  security: {
    emailVerified: false,
  },
  safety: {
    autoShareLocationOnSos: true,
    autoCallHotlineOnSos: false,
  },
});

const SessionProbe = () => {
  latestSession = useSessionContext();

  return <Text testID="session-phone">{latestSession.profile?.phoneNumber ?? ""}</Text>;
};

const renderSessionProvider = () =>
  render(
    <SessionProvider>
      <SessionProbe />
    </SessionProvider>,
  );

describe("SessionProvider saveProfile recovery", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    latestSession = null;
    mockAuthUser = {
      uid: "user-1",
      displayName: "Jake Fr",
      email: "jakefr67@gmail.com",
      emailVerified: false,
    };
    mockGetCurrentUserIdentity.mockReturnValue(mockAuthUser);
    mockListenToProfile.mockImplementation((_userId: string, callback: (profile: UserProfile | null) => void) => {
      callback(null);
      return jest.fn();
    });
    mockListenToGroups.mockImplementation((_userId: string, callback: (groups: unknown[]) => void) => {
      callback([]);
      return jest.fn();
    });
  });

  it("keeps the optimistic onboarding profile in memory when the first save fails", async () => {
    mockSaveProfile.mockRejectedValueOnce(new Error("Account created, but profile setup could not finish."));

    renderSessionProvider();

    await act(async () => {
      await expect(
        latestSession?.saveProfile({
          name: "Jake Fr",
          email: "jakefr67@gmail.com",
          phoneNumber: "+638723917319",
          onboarding: {
            currentStep: "verify",
            profileComplete: false,
            circleComplete: false,
            permissionsComplete: false,
          },
        }) ?? Promise.reject(new Error("Session unavailable")),
      ).rejects.toThrow("Account created, but profile setup could not finish.");
    });

    await waitFor(() => {
      expect(screen.getByTestId("session-phone")).toHaveTextContent("+638723917319");
      expect(latestSession?.profile?.phoneNumber).toBe("+638723917319");
    });
  });

  it("rolls back to the previous persisted profile when an existing profile edit fails", async () => {
    const persistedProfile = defaultProfile();
    mockListenToProfile.mockImplementation((_userId: string, callback: (profile: UserProfile | null) => void) => {
      callback(persistedProfile);
      return jest.fn();
    });
    mockSaveProfile.mockRejectedValueOnce(new Error("Save failed"));

    renderSessionProvider();

    await waitFor(() => {
      expect(screen.getByTestId("session-phone")).toHaveTextContent("+638723917319");
    });

    await act(async () => {
      await expect(
        latestSession?.saveProfile({
          phoneNumber: "+639111111111",
        }) ?? Promise.reject(new Error("Session unavailable")),
      ).rejects.toThrow("Save failed");
    });

    await waitFor(() => {
      expect(screen.getByTestId("session-phone")).toHaveTextContent("+638723917319");
      expect(latestSession?.profile?.phoneNumber).toBe("+638723917319");
    });
  });
});
