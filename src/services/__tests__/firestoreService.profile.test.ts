/** Purpose: Verify first profile writes survive the fresh Firebase Auth session race. */
import type { UserProfile } from "@/types";

const mockSetDoc = jest.fn();
const mockGetIdToken = jest.fn();
let mockCurrentUser: { getIdToken: jest.Mock; uid: string } | null = null;

jest.mock("@react-native-firebase/firestore", () => ({
  collection: jest.fn(),
  collectionGroup: jest.fn(),
  deleteDoc: jest.fn(),
  doc: jest.fn((_db: unknown, ...segments: string[]) => ({ path: segments.join("/") })),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  getFirestore: jest.fn(() => ({})),
  onSnapshot: jest.fn(),
  orderBy: jest.fn(),
  query: jest.fn(),
  setDoc: (...args: unknown[]) => mockSetDoc(...args),
  where: jest.fn(),
  writeBatch: jest.fn(),
}));

jest.mock("@/config/backendRuntime", () => ({
  resolveActiveFirebaseClientMode: jest.fn(() => "firebase"),
}));

jest.mock("@/services/firebase", () => ({
  firebaseAuth: jest.fn(() => ({ currentUser: mockCurrentUser })),
  hasFirebaseApp: jest.fn(() => true),
}));

const buildProfile = (userId = "user-1"): UserProfile => ({
  userId,
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

const permissionDenied = () => Object.assign(new Error("permission denied"), { code: "firestore/permission-denied" });

describe("firestoreService.saveProfile", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetIdToken.mockResolvedValue("token");
    mockCurrentUser = { getIdToken: mockGetIdToken, uid: "user-1" };
  });

  it("refreshes auth and retries a self-profile write after permission-denied", async () => {
    const { firestoreService } = require("@/services/firestoreService");
    const profile = buildProfile();
    mockSetDoc.mockRejectedValueOnce(permissionDenied()).mockResolvedValueOnce(undefined);

    await expect(firestoreService.saveProfile(profile)).resolves.toEqual(profile);

    expect(mockSetDoc).toHaveBeenCalledTimes(2);
    expect(mockGetIdToken).toHaveBeenCalledWith(true);
  });

  it("does not retry when the current auth user does not own the profile document", async () => {
    const { firestoreService } = require("@/services/firestoreService");
    mockCurrentUser = { getIdToken: mockGetIdToken, uid: "someone-else" };
    mockSetDoc.mockRejectedValueOnce(permissionDenied());

    await expect(firestoreService.saveProfile(buildProfile("user-1"))).rejects.toThrow(
      "Account created, but profile setup could not finish.",
    );

    expect(mockSetDoc).toHaveBeenCalledTimes(1);
    expect(mockGetIdToken).not.toHaveBeenCalled();
  });

  it("does not retry when Firebase Auth has not exposed a current user", async () => {
    const { firestoreService } = require("@/services/firestoreService");
    mockCurrentUser = null;
    mockSetDoc.mockRejectedValueOnce(permissionDenied());

    await expect(firestoreService.saveProfile(buildProfile("user-1"))).rejects.toThrow(
      "Account created, but profile setup could not finish.",
    );

    expect(mockSetDoc).toHaveBeenCalledTimes(1);
    expect(mockGetIdToken).not.toHaveBeenCalled();
  });
});
