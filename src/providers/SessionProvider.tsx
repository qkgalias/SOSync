/** Purpose: Coordinate auth state, profile data, and selected trusted circle across the app. */
import { createContext, startTransition, useContext, useEffect, useMemo, useState } from "react";
import type { PropsWithChildren } from "react";

import type { Group, GroupRole, UserProfile } from "@/types";
import { resolveActiveFirebaseClientMode } from "@/config/backendRuntime";
import { authService, type AuthIdentity } from "@/services/authService";
import { circleService } from "@/services/circleService";
import { hasFirebaseApp } from "@/services/firebase";
import { firestoreService } from "@/services/firestoreService";
import { notificationService } from "@/services/notificationService";
import { USER_SEED } from "@/utils/constants";

type SessionContextValue = {
  status: "loading" | "signedOut" | "signedIn";
  authUser: AuthIdentity | null;
  profile: UserProfile | null;
  groups: Group[];
  selectedGroupId: string | null;
  pendingVerificationEmail: string;
  isOnboardingComplete: boolean;
  setSelectedGroupId: (groupId: string | null) => void;
  signInWithEmail: (email: string, password: string) => Promise<AuthIdentity>;
  signUpWithEmail: (name: string, email: string, password: string) => Promise<AuthIdentity>;
  sendPasswordReset: (email: string) => Promise<void>;
  sendEmailOtp: () => Promise<{ resendAvailableAt: string; sentAt: string }>;
  resendEmailOtp: () => Promise<{ resendAvailableAt: string; sentAt: string }>;
  verifyEmailOtp: (code: string) => Promise<AuthIdentity>;
  updatePassword: (currentPassword: string, nextPassword: string) => Promise<void>;
  saveProfile: (nextProfile: Partial<UserProfile>) => Promise<UserProfile>;
  createCircle: (name: string) => Promise<Group>;
  joinCircleWithInvite: (inviteCode: string) => Promise<void>;
  skipCircleSetup: () => Promise<UserProfile>;
  leaveCircle: (groupId: string) => Promise<void>;
  removeCircleMember: (groupId: string, targetUserId: string) => Promise<void>;
  updateCircleMemberRole: (groupId: string, targetUserId: string, nextRole: GroupRole) => Promise<void>;
  transferCircleOwnership: (groupId: string, nextOwnerUserId: string) => Promise<void>;
  deleteAccount: (currentPassword?: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export const SessionProvider = ({ children }: PropsWithChildren) => {
  const [status, setStatus] = useState<SessionContextValue["status"]>("loading");
  const [authUser, setAuthUser] = useState<AuthIdentity | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupIdState] = useState<string | null>(null);
  const pendingVerificationEmail = authService.getPendingVerificationEmail();
  const defaultOnboarding: UserProfile["onboarding"] = {
    currentStep: "welcome",
    profileComplete: false,
    circleComplete: false,
    permissionsComplete: false,
  };

  const normalizeProfile = (nextProfile: UserProfile | null) => {
    if (!nextProfile) {
      return null;
    }

    const nextProfileSecurity = nextProfile.security ?? USER_SEED.security;

    return {
      ...nextProfile,
      name: nextProfile.name ?? authUser?.displayName ?? "",
      email: nextProfile.email ?? authUser?.email ?? undefined,
      phoneNumber: nextProfile.phoneNumber ?? authUser?.phoneNumber ?? undefined,
      photoURL: nextProfile.photoURL ?? authUser?.photoURL ?? undefined,
      onboarding: {
        ...defaultOnboarding,
        ...(nextProfile.onboarding ?? {}),
      },
      preferences: {
        ...USER_SEED.preferences,
        ...(nextProfile.preferences ?? {}),
      },
      privacy: {
        ...USER_SEED.privacy,
        ...(nextProfile.privacy ?? {}),
      },
      security: {
        ...USER_SEED.security,
        ...nextProfileSecurity,
        emailVerified: Boolean(nextProfileSecurity.emailVerified || authUser?.emailVerified),
      },
      safety: {
        ...USER_SEED.safety,
        ...(nextProfile.safety ?? {}),
      },
    };
  };

  useEffect(() => authService.subscribe((user) => {
    setAuthUser(user);
    setStatus(user ? "signedIn" : "signedOut");
  }), []);

  useEffect(() => {
    if (!authUser) {
      startTransition(() => {
        setProfile(null);
        setGroups([]);
        setSelectedGroupIdState(null);
      });
      return;
    }

    const unsubscribeProfile = firestoreService.listenToProfile(authUser.uid, (nextProfile) => {
      startTransition(() => {
        setProfile(normalizeProfile(nextProfile));
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
    if (!groups.length) {
      if (selectedGroupId !== null) {
        setSelectedGroupIdState(null);
      }
      return;
    }

    const selectedGroupStillExists = selectedGroupId
      ? groups.some((group) => group.groupId === selectedGroupId)
      : false;

    if (selectedGroupStillExists) {
      return;
    }

    const preferredGroupId = profile?.defaultGroupId;
    const nextGroupId =
      groups.find((group) => group.groupId === preferredGroupId)?.groupId ?? groups[0]?.groupId ?? null;

    if (nextGroupId !== selectedGroupId) {
      setSelectedGroupIdState(nextGroupId);
    }
  }, [groups, profile?.defaultGroupId, selectedGroupId]);

  useEffect(() => {
    if (!authUser?.uid) {
      return;
    }

    notificationService.registerDevice(authUser.uid).catch((error) => {
      console.warn("Device push registration failed.", error);
    });
    const unsubscribeTokenRefresh = notificationService.listenToTokenRefresh(authUser.uid);

    return () => {
      unsubscribeTokenRefresh();
    };
  }, [authUser?.uid]);

  const buildMergedProfile = (nextProfile: Partial<UserProfile>, userId: string): UserProfile => {
    const baseProfile =
      profile ?? {
        ...USER_SEED,
        userId,
        name: authUser?.displayName ?? "",
        email: authUser?.email ?? undefined,
        phoneNumber: authUser?.phoneNumber ?? undefined,
        photoURL: authUser?.photoURL ?? undefined,
        defaultGroupId: undefined,
        createdAt: new Date().toISOString(),
        lastActive: new Date().toISOString(),
        onboarding: {
          ...defaultOnboarding,
        },
      };

    const mergedSecurity = {
      ...(baseProfile.security ?? USER_SEED.security),
      ...(nextProfile.security ?? {}),
      emailVerified: Boolean(
        baseProfile.security?.emailVerified ||
          nextProfile.security?.emailVerified ||
          authUser?.emailVerified,
      ),
    };

    return {
      ...baseProfile,
      ...nextProfile,
      userId,
      email: nextProfile.email ?? profile?.email ?? authUser?.email ?? USER_SEED.email,
      phoneNumber: nextProfile.phoneNumber ?? profile?.phoneNumber ?? authUser?.phoneNumber ?? USER_SEED.phoneNumber,
      onboarding: {
        ...(profile?.onboarding ?? defaultOnboarding),
        ...(nextProfile.onboarding ?? {}),
      },
      preferences: {
        ...(profile?.preferences ?? USER_SEED.preferences),
        ...(nextProfile.preferences ?? {}),
      },
      privacy: {
        ...(profile?.privacy ?? USER_SEED.privacy),
        ...(nextProfile.privacy ?? {}),
      },
      security: mergedSecurity,
      safety: {
        ...(profile?.safety ?? USER_SEED.safety),
        ...(nextProfile.safety ?? {}),
      },
      lastActive: new Date().toISOString(),
    };
  };

  const upsertGroupState = (nextGroup: Group) => {
    setGroups((currentGroups) => {
      const existingIndex = currentGroups.findIndex((group) => group.groupId === nextGroup.groupId);
      if (existingIndex === -1) {
        return [nextGroup, ...currentGroups];
      }

      const updatedGroups = [...currentGroups];
      updatedGroups[existingIndex] = { ...updatedGroups[existingIndex], ...nextGroup };
      return updatedGroups;
    });
  };

  const patchGroupState = (groupId: string, updates: Partial<Group>) => {
    setGroups((currentGroups) =>
      currentGroups.map((group) => (group.groupId === groupId ? { ...group, ...updates } : group)),
    );
  };

  const syncProfileInBackground = (nextProfile: UserProfile) => {
    void firestoreService.saveProfile(nextProfile).then((savedProfile) => {
      startTransition(() => {
        setProfile(savedProfile);
      });
    }).catch((error) => {
      console.warn("Background profile sync failed.", error);
    });
  };

  const requireSessionUserId = () => {
    const resolvedUserId = authUser?.uid ?? authService.getCurrentUserIdentity()?.uid;

    if (resolveActiveFirebaseClientMode(hasFirebaseApp()) === "firebase" && !resolvedUserId) {
      throw new Error("Your Firebase session is still loading. Please try again.");
    }

    return resolvedUserId ?? USER_SEED.userId;
  };

  const setSelectedGroupId = (groupId: string | null) => {
    setSelectedGroupIdState(groupId);

    if (!authUser?.uid || !profile) {
      return;
    }

    const optimisticProfile = buildMergedProfile({ defaultGroupId: groupId ?? undefined }, authUser.uid);
    startTransition(() => {
      setProfile(optimisticProfile);
    });
    syncProfileInBackground(optimisticProfile);
  };

  const saveProfile = async (nextProfile: Partial<UserProfile>) => {
    const currentUser = { uid: requireSessionUserId() };
    const previousProfile = profile;
    const mergedProfile: UserProfile = {
      ...buildMergedProfile(nextProfile, currentUser.uid),
    };
    const shouldPreserveOptimisticProfile = !previousProfile && mergedProfile.userId === currentUser.uid;

    startTransition(() => {
      setProfile(mergedProfile);
    });

    try {
      const savedProfile = await firestoreService.saveProfile(mergedProfile);
      await firestoreService.syncGroupMemberProfile(currentUser.uid, groups, savedProfile).catch(() => undefined);
      setProfile(savedProfile);
      return savedProfile;
    } catch (error) {
      if (!shouldPreserveOptimisticProfile) {
        startTransition(() => {
          setProfile(previousProfile);
        });
      }
      throw error;
    }
  };

  const resolveCircleOnboardingState = (nextStep: "invite" | "permissions") => {
    const alreadyComplete = Boolean(
      profile?.security?.emailVerified &&
        profile?.onboarding?.profileComplete &&
        profile?.onboarding?.circleComplete &&
        profile?.onboarding?.permissionsComplete,
    );

    if (alreadyComplete) {
      return {
        currentStep: "complete" as const,
        profileComplete: true,
        circleComplete: true,
        permissionsComplete: true,
      };
    }

    return {
      currentStep: nextStep,
      profileComplete: true,
      circleComplete: true,
      permissionsComplete: false,
    };
  };

  const createCircle = async (name: string) => {
    const userId = requireSessionUserId();
    const group = await circleService.createCircle({
      name,
      displayName: profile?.name ?? authUser?.displayName ?? "Responder",
    });
    const optimisticProfile: UserProfile = buildMergedProfile(
      {
        defaultGroupId: group.groupId,
        onboarding: resolveCircleOnboardingState("invite"),
      },
      userId,
    );

    startTransition(() => {
      setSelectedGroupIdState(group.groupId);
      upsertGroupState(group);
      setProfile(optimisticProfile);
    });

    syncProfileInBackground(optimisticProfile);
    await firestoreService.syncGroupMemberProfile(userId, [group], optimisticProfile).catch(() => undefined);

    return group;
  };

  const joinCircleWithInvite = async (inviteCode: string) => {
    const userId = requireSessionUserId();

    const response = await circleService.joinCircleByCode({
      inviteCode,
      displayName: profile?.name ?? authUser?.displayName ?? "Responder",
    });
    const joinedGroup = response.group;

    const optimisticProfile: UserProfile = buildMergedProfile(
      {
        defaultGroupId: joinedGroup.groupId,
        onboarding: resolveCircleOnboardingState("permissions"),
      },
      userId,
    );

    startTransition(() => {
      setSelectedGroupIdState(joinedGroup.groupId);
      upsertGroupState(joinedGroup);
      setProfile(optimisticProfile);
    });

    syncProfileInBackground(optimisticProfile);
    await firestoreService.syncGroupMemberProfile(userId, [joinedGroup], optimisticProfile).catch(() => undefined);
  };

  const skipCircleSetup = async () => {
    const userId = requireSessionUserId();
    const optimisticProfile: UserProfile = buildMergedProfile(
      {
        defaultGroupId: undefined,
        onboarding: {
          currentStep: "permissions",
          profileComplete: true,
          circleComplete: true,
          permissionsComplete: false,
        },
      },
      userId,
    );

    startTransition(() => {
      setSelectedGroupIdState(null);
      setProfile(optimisticProfile);
    });

    syncProfileInBackground(optimisticProfile);
    return optimisticProfile;
  };

  const leaveCircle = async (groupId: string) => {
    const userId = requireSessionUserId();
    await circleService.leaveCircle({ groupId });

    const remainingGroups = groups.filter((group) => group.groupId !== groupId);
    const nextDefaultGroupId =
      selectedGroupId === groupId
        ? remainingGroups.find((group) => group.groupId === profile?.defaultGroupId)?.groupId ??
          remainingGroups[0]?.groupId ??
          null
        : profile?.defaultGroupId ?? remainingGroups[0]?.groupId ?? null;

    startTransition(() => {
      setGroups(remainingGroups);
      if (selectedGroupId === groupId) {
        setSelectedGroupIdState(nextDefaultGroupId);
      }
    });

    if (profile) {
      const optimisticProfile = buildMergedProfile({ defaultGroupId: nextDefaultGroupId ?? undefined }, userId);
      startTransition(() => {
        setProfile(optimisticProfile);
      });
      syncProfileInBackground(optimisticProfile);
    }
  };

  const removeCircleMember = async (groupId: string, targetUserId: string) => {
    await circleService.removeMember({ groupId, targetUserId });
    const currentGroup = groups.find((group) => group.groupId === groupId);
    if (currentGroup) {
      patchGroupState(groupId, { membersCount: Math.max(currentGroup.membersCount - 1, 0) });
    }
  };

  const updateCircleMemberRole = async (groupId: string, targetUserId: string, nextRole: GroupRole) => {
    await circleService.updateMemberRole({ groupId, targetUserId, nextRole });
    if (targetUserId === authUser?.uid) {
      patchGroupState(groupId, { memberRole: nextRole });
    }
  };

  const transferCircleOwnership = async (groupId: string, nextOwnerUserId: string) => {
    await circleService.transferOwnership({ groupId, nextOwnerUserId });
    patchGroupState(groupId, { ownerId: nextOwnerUserId });
  };

  const value = useMemo<SessionContextValue>(
    () => ({
      status,
      authUser,
      profile,
      groups,
      selectedGroupId,
      pendingVerificationEmail,
      isOnboardingComplete: Boolean(
        profile?.security?.emailVerified &&
        profile?.onboarding?.profileComplete &&
          profile?.onboarding?.circleComplete &&
          profile?.onboarding?.permissionsComplete,
      ),
      setSelectedGroupId,
      signInWithEmail: async (email, password) => {
        const nextUser = await authService.signInWithEmail(email, password);
        startTransition(() => {
          setAuthUser(nextUser);
        });
        return nextUser;
      },
      signUpWithEmail: async (name, email, password) => {
        const nextUser = await authService.signUpWithEmail(name, email, password);
        startTransition(() => {
          setAuthUser(nextUser);
        });
        return nextUser;
      },
      sendPasswordReset: async (email) => {
        await authService.sendPasswordReset(email);
      },
      sendEmailOtp: async () => {
        return authService.sendEmailOtp();
      },
      resendEmailOtp: async () => {
        return authService.resendEmailOtp();
      },
      verifyEmailOtp: async (code) => {
        const nextUser = await authService.verifyEmailOtp(code);
        startTransition(() => {
          setAuthUser(nextUser);
        });
        return nextUser;
      },
      updatePassword: async (currentPassword, nextPassword) => {
        await authService.updatePassword(currentPassword, nextPassword);
      },
      saveProfile,
      createCircle,
      joinCircleWithInvite,
      skipCircleSetup,
      leaveCircle,
      removeCircleMember,
      updateCircleMemberRole,
      transferCircleOwnership,
      deleteAccount: async (currentPassword) => {
        if (authUser?.uid) {
          await firestoreService.deleteAccountData(
            authUser.uid,
            groups.map((group) => group.groupId),
          );
        }
        await authService.deleteAccount(currentPassword);
      },
      signOut: async () => {
        if (authUser?.uid) {
          await notificationService.deleteCurrentToken(authUser.uid).catch(() => undefined);
        }
        await authService.signOut();
      },
    }),
    [authUser, groups, pendingVerificationEmail, profile, selectedGroupId, status],
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
