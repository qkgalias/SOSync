/** Purpose: Keep notification recipient cutoffs testable outside Firebase fanout. */
export const memberJoinedBeforeNotification = (joinedAt: unknown, notificationCreatedAt?: string) => {
  if (!notificationCreatedAt || typeof joinedAt !== "string" || !joinedAt.trim()) {
    return true;
  }

  const joinedAtMs = Date.parse(joinedAt);
  const notificationCreatedAtMs = Date.parse(notificationCreatedAt);
  if (!Number.isFinite(joinedAtMs) || !Number.isFinite(notificationCreatedAtMs)) {
    return true;
  }

  return joinedAtMs <= notificationCreatedAtMs;
};
