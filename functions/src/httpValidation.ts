/** Purpose: Provide pure HTTP validation helpers that can be tested outside Cloud Functions. */
import { createHash } from "node:crypto";

export const extractBearerToken = (authorizationHeader?: string | string[]) => {
  const rawHeader = Array.isArray(authorizationHeader) ? authorizationHeader[0] : authorizationHeader;
  const normalizedHeader = String(rawHeader ?? "").trim();
  const match = normalizedHeader.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() ?? "";
};

export const extractForwardedIp = (forwardedHeader?: string | string[]) => {
  const rawHeader = Array.isArray(forwardedHeader) ? forwardedHeader[0] : forwardedHeader;
  return String(rawHeader ?? "")
    .split(",")
    .map((value) => value.trim())
    .find(Boolean) ?? "";
};

export const coerceCoordinate = (value: unknown, minimum: number, maximum: number) => {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed < minimum || parsed > maximum) {
    return null;
  }

  return parsed;
};

export const resolveRateLimitWindow = (now: number, windowMs: number) => {
  const windowStartedAt = Math.floor(now / windowMs) * windowMs;
  const resetAt = windowStartedAt + windowMs;

  return {
    resetAt,
    retryAfterSeconds: Math.max(1, Math.ceil((resetAt - now) / 1000)),
    windowStartedAt,
  };
};

export const buildRateLimitDocId = (routeKey: string, subjectKey: string, windowStartedAt: number) =>
  createHash("sha256").update(`${routeKey}:${subjectKey}:${windowStartedAt}`).digest("hex");
