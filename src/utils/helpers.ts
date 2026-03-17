/** Purpose: Small formatting, sharing, and geo helper utilities reused across modules. */
import { formatDistanceToNowStrict } from "date-fns";

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
  `Join my SOSync circle "${groupName}" with code ${inviteCode}. Open SOSync or paste the code during onboarding.`;

export const toLocationId = (groupId: string, userId: string) => `${groupId}_${userId}`;

export const toCallHref = (phone: string) => `tel:${phone.replace(/\s+/g, "")}`;
