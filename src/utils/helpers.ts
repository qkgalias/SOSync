/** Purpose: Small formatting, sharing, and geo helper utilities reused across modules. */
import { formatDistanceToNowStrict } from "date-fns";
import type { Href, Router } from "expo-router";

import type { SafetyStatus } from "@/types";

export const cn = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

export const formatTimestampLabel = (value: string) =>
  formatDistanceToNowStrict(new Date(value), { addSuffix: true });

export const toDistanceLabel = (distanceMeters: number) =>
  distanceMeters >= 1000
    ? `${(distanceMeters / 1000).toFixed(1)} km`
    : `${Math.round(distanceMeters)} m`;

export const toDurationLabel = (durationSeconds: number) =>
  durationSeconds >= 3600
    ? `${Math.round(durationSeconds / 3600)} hr`
    : `${Math.round(durationSeconds / 60)} min`;

export const buildInviteMessage = (groupName: string, inviteCode: string) =>
  `Join my SOSync circle "${groupName}". Open SOSync, tap Join circle, and enter ${inviteCode}.`;

export const goBackOrReplace = (
  router: Pick<Router, "back" | "canGoBack" | "replace">,
  fallbackHref: Href,
) => {
  if (router.canGoBack()) {
    router.back();
    return;
  }

  router.replace(fallbackHref);
};

export const toLocationId = (groupId: string, userId: string) => `${groupId}_${userId}`;
export const buildNotificationFeedId = (kind: string, entityId: string) => `${kind}:${entityId}`;

export const toCallHref = (phone: string) => `tel:${phone.replace(/\s+/g, "")}`;

export const toInitials = (value: string) =>
  value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

export const formatPhoneForDisplay = (phoneNumber?: string | null) =>
  phoneNumber?.trim() ? phoneNumber : "No number saved";

export const getSafetyStatusLabel = (status: SafetyStatus) => {
  switch (status) {
    case "need_help":
      return "Need Help";
    case "need_evacuation":
      return "Need Evacuation";
    case "unavailable":
      return "Unavailable";
    default:
      return "Safe";
  }
};
