/** Purpose: Coordinate auth state, profile data, and selected trusted circle across the app. */
import { createContext, startTransition, useContext, useEffect, useMemo, useState } from "react";
import type { PropsWithChildren } from "react";

import type { Group, GroupInvite, UserProfile } from "@/types";
import { authService, type AuthIdentity } from "@/services/authService";
import { firestoreService } from "@/services/firestoreService";
import { notificationService } from "@/services/notificationService";
import { USER_SEED } from "@/utils/constants";

type SessionContextValue = {
  status: "loading" | "signedOut" | "signedIn";
  authUser: AuthIdentity | null;
  profile: UserProfile | null;
  groups: Group[];
  selectedGroupId: string | null;
  pendingPhoneNumber: string;
  isOnboardingComplete: boolean;
  setSelectedGroupId: (groupId: string) => void;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (name: string, email: string, password: string) => Promise<void>;
  startPhoneSignIn: (phoneNumber: string) => Promise<void>;
  confirmPhoneCode: (code: string) => Promise<void>;
  saveProfile: (nextProfile: Partial<UserProfile>) => Promise<UserProfile>;
  createCircle: (name: string) => Promise<Group>;
  createInvite: (contact: string, channel: GroupInvite["channel"]) => Promise<GroupInvite>;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export const SessionProvider = ({ children }: PropsWithChildren) => {
  const [status, setStatus] = useState<SessionContextValue["status"]>("loading");
  const [authUser, setAuthUser] = useState<AuthIdentity | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const pendingPhoneNumber = authService.getPendingPhoneNumber();

  useEffect(() => authService.subscribe((user) => {
    setAuthUser(user);
    setStatus(user ? "signedIn" : "signedOut");
  }), []);

  useEffect(() => {
    if (!authUser) {
      startTransition(() => {
        setProfile(null);
        setGroups([]);
        setSelectedGroupId(null);
      });
      return;
    }

    const unsubscribeProfile = firestoreService.listenToProfile(authUser.uid, (nextProfile) => {
      startTransition(() => {
        setProfile(nextProfile);
      });
    });

    const unsubscribeGroups = firestoreService.listenToGroups(authUser.uid, (nextGroups) => {
      startTransition(() => {
        setGroups(nextGroups);
      });
    });

    return () => {
      unsubscribeProfile();
      unsubscribeGroups();
    };
  }, [authUser]);

  useEffect(() => {
    if (!selectedGroupId) {
      setSelectedGroupId(profile?.defaultGroupId ?? groups[0]?.groupId ?? null);
    }
  }, [groups, profile?.defaultGroupId, selectedGroupId]);

  useEffect(() => {
    if (!authUser?.uid) {
      return;
    }

    notificationService.registerDevice(authUser.uid).catch(() => undefined);
    const unsubscribeTokenRefresh = notificationService.listenToTokenRefresh(authUser.uid);

    return () => {
      unsubscribeTokenRefresh();
    };
  }, [authUser?.uid]);

  const saveProfile = async (nextProfile: Partial<UserProfile>) => {
    const currentUser = authUser ?? { uid: USER_SEED.userId };
    const mergedProfile: UserProfile = {
      ...(profile ?? USER_SEED),
      ...nextProfile,
      userId: currentUser.uid,
      email: nextProfile.email ?? profile?.email ?? authUser?.email ?? USER_SEED.email,
      phoneNumber:
        nextProfile.phoneNumber ?? profile?.phoneNumber ?? authUser?.phoneNumber ?? USER_SEED.phoneNumber,
      lastActive: new Date().toISOString(),
    };

    const savedProfile = await firestoreService.saveProfile(mergedProfile);
    setProfile(savedProfile);
    return savedProfile;
  };

  const createCircle = async (name: string) => {
    const userId = authUser?.uid ?? USER_SEED.userId;
    const group = await firestoreService.createGroup(userId, name);
    setSelectedGroupId(group.groupId);
    await saveProfile({
      defaultGroupId: group.groupId,
      onboarding: {
        currentStep: "permissions",
        profileComplete: true,
        circleComplete: true,
        permissionsComplete: false,
      },
    });
    return group;
  };

  const createInvite = async (contact: string, channel: GroupInvite["channel"]) => {
    const groupId = selectedGroupId ?? groups[0]?.groupId ?? "demo-group";
    return firestoreService.createInvite(groupId, authUser?.uid ?? USER_SEED.userId, contact, channel);
  };

  const value = useMemo<SessionContextValue>(
    () => ({
      status,
      authUser,
      profile,
      groups,
      selectedGroupId,
      pendingPhoneNumber,
      isOnboardingComplete: Boolean(
        profile?.onboarding.profileComplete &&
          profile?.onboarding.circleComplete &&
          profile?.onboarding.permissionsComplete,
      ),
      setSelectedGroupId,
      signInWithEmail: async (email, password) => {
        await authService.signInWithEmail(email, password);
      },
      signUpWithEmail: async (name, email, password) => {
        await authService.signUpWithEmail(name, email, password);
      },
      startPhoneSignIn: async (phoneNumber) => {
        await authService.startPhoneSignIn(phoneNumber);
      },
      confirmPhoneCode: async (code) => {
        await authService.confirmPhoneCode(code);
      },
      saveProfile,
      createCircle,
      createInvite,
      signOut: async () => {
        if (authUser?.uid) {
          await notificationService.deleteCurrentToken(authUser.uid).catch(() => undefined);
        }
        await authService.signOut();
      },
    }),
    [authUser, createCircle, groups, pendingPhoneNumber, profile, selectedGroupId, status],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
};

export const useSessionContext = () => {
  const value = useContext(SessionContext);
  if (!value) {
    throw new Error("useSessionContext must be used within SessionProvider.");
  }

  return value;
};
