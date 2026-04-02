/** Purpose: Secure HTTP routes with consistent CORS, auth, validation, and rate limiting. */
import type { Request } from "firebase-functions/v2/https";
import type { Response } from "express";

import { adminAuth, adminDb } from "./admin.js";
import { nowIso } from "./helpers.js";
import {
  buildRateLimitDocId,
  extractBearerToken,
  extractForwardedIp,
  resolveRateLimitWindow,
} from "./httpValidation.js";

type RateLimitOptions = {
  limit: number;
  routeKey: string;
  subjectKey: string;
  windowMs: number;
};

type AuthenticatedHttpContext = {
  ipAddress: string;
  userId: string;
};

type RequireAuthOptions = {
  authenticatedLimit: number;
  routeKey: string;
  unauthenticatedLimit: number;
  windowMs: number;
};

const RATE_LIMIT_COLLECTION = "_rate_limits";

export const setCorsHeaders = (response: Response) => {
  response.set("Access-Control-Allow-Origin", "*");
  response.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
  response.set("Access-Control-Allow-Methods", "OPTIONS, POST");
};

export const handleCorsPreflight = (request: Request, response: Response) => {
  if (request.method !== "OPTIONS") {
    return false;
  }

  response.status(204).send("");
  return true;
};

export const ensurePostRequest = (request: Request, response: Response) => {
  if (request.method === "POST") {
    return true;
  }

  response.status(405).json({ error: "Use POST for this endpoint." });
  return false;
};

export const extractClientIp = (request: Request) =>
  extractForwardedIp(request.headers["x-forwarded-for"]) ||
  request.ip ||
  request.socket.remoteAddress ||
  "unknown";

export const sendJsonError = (response: Response, statusCode: number, message: string) => {
  response.status(statusCode).json({ error: message });
};

const takeRateLimit = async ({ limit, routeKey, subjectKey, windowMs }: RateLimitOptions) => {
  const now = Date.now();
  const window = resolveRateLimitWindow(now, windowMs);
  const rateLimitRef = adminDb.collection(RATE_LIMIT_COLLECTION).doc(
    buildRateLimitDocId(routeKey, subjectKey, window.windowStartedAt),
  );

  const count = await adminDb.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(rateLimitRef);
    const nextCount = Number(snapshot.data()?.count ?? 0) + 1;

    transaction.set(
      rateLimitRef,
      {
        count: nextCount,
        createdAt: snapshot.data()?.createdAt ?? nowIso(),
        limit,
        resetAt: new Date(window.resetAt).toISOString(),
        routeKey,
        subjectKey,
        updatedAt: nowIso(),
        windowStartedAt: new Date(window.windowStartedAt).toISOString(),
      },
      { merge: true },
    );

    return nextCount;
  });

  return {
    allowed: count <= limit,
    count,
    limit,
    retryAfterSeconds: window.retryAfterSeconds,
  };
};

export const sendRateLimitExceeded = (
  response: Response,
  rateLimit: { count: number; limit: number; retryAfterSeconds: number },
) => {
  response.set("Retry-After", String(rateLimit.retryAfterSeconds));
  response.status(429).json({
    error: "Too many requests. Try again shortly.",
    limit: rateLimit.limit,
    observedCount: rateLimit.count,
    retryAfterSeconds: rateLimit.retryAfterSeconds,
  });
};

export const requireAuthenticatedRequest = async (
  request: Request,
  response: Response,
  options: RequireAuthOptions,
): Promise<AuthenticatedHttpContext | null> => {
  const ipAddress = extractClientIp(request);
  const bearerToken = extractBearerToken(request.headers.authorization);

  if (!bearerToken) {
    const rateLimit = await takeRateLimit({
      limit: options.unauthenticatedLimit,
      routeKey: `${options.routeKey}:unauthenticated`,
      subjectKey: `ip:${ipAddress}`,
      windowMs: options.windowMs,
    });

    if (!rateLimit.allowed) {
      sendRateLimitExceeded(response, rateLimit);
      return null;
    }

    sendJsonError(response, 401, "Authentication required.");
    return null;
  }

  try {
    const decodedToken = await adminAuth.verifyIdToken(bearerToken);
    const rateLimit = await takeRateLimit({
      limit: options.authenticatedLimit,
      routeKey: options.routeKey,
      subjectKey: `user:${decodedToken.uid}`,
      windowMs: options.windowMs,
    });

    if (!rateLimit.allowed) {
      sendRateLimitExceeded(response, rateLimit);
      return null;
    }

    return {
      ipAddress,
      userId: decodedToken.uid,
    };
  } catch {
    const rateLimit = await takeRateLimit({
      limit: options.unauthenticatedLimit,
      routeKey: `${options.routeKey}:invalid-auth`,
      subjectKey: `ip:${ipAddress}`,
      windowMs: options.windowMs,
    });

    if (!rateLimit.allowed) {
      sendRateLimitExceeded(response, rateLimit);
      return null;
    }

    sendJsonError(response, 401, "Authentication required.");
    return null;
  }
};
