/** Purpose: Normalize offline/backend failures into safe, user-facing copy across app flows. */
import NetInfo from "@react-native-community/netinfo";
import axios from "axios";

type FriendlyBackendErrorOptions = {
  authMessage?: string;
  genericMessage: string;
  isOffline?: boolean;
  offlineMessage: string;
  rateLimitMessage?: string;
  timeoutMessage?: string;
};

const extractErrorCode = (error: unknown) => {
  if (!error || typeof error !== "object") {
    return "";
  }

  const candidate = "code" in error ? error.code : "";
  return typeof candidate === "string" ? candidate : "";
};

const extractErrorMessage = (error: unknown) => {
  if (!error || typeof error !== "object") {
    return "";
  }

  const candidate = "message" in error ? error.message : "";
  return typeof candidate === "string" ? candidate : "";
};

const extractHttpStatus = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    return error.response?.status ?? null;
  }

  if (!error || typeof error !== "object") {
    return null;
  }

  const response = "response" in error ? error.response : null;
  if (!response || typeof response !== "object") {
    return null;
  }

  const candidate = "status" in response ? response.status : null;
  return typeof candidate === "number" ? candidate : null;
};

export const isOfflineLikeError = (error: unknown) => {
  const code = extractErrorCode(error).toLowerCase();
  const message = extractErrorMessage(error).toLowerCase();

  return (
    code.includes("network-request-failed") ||
    code.includes("unavailable") ||
    message.includes("network request failed") ||
    message.includes("network error") ||
    message.includes("failed to connect") ||
    message.includes("offline")
  );
};

export const isTimeoutLikeError = (error: unknown) => {
  const code = extractErrorCode(error).toLowerCase();
  const message = extractErrorMessage(error).toLowerCase();

  return (
    code.includes("deadline-exceeded") ||
    code.includes("timeout") ||
    message.includes("deadline exceeded") ||
    message.includes("did not respond in time") ||
    message.includes("timed out") ||
    message.includes("timeout")
  );
};

export const getIsOffline = async () => {
  const state = await NetInfo.fetch();
  return state.isConnected === false || state.isInternetReachable === false;
};

export const toFriendlyBackendErrorMessage = (error: unknown, options: FriendlyBackendErrorOptions) => {
  if (options.isOffline || isOfflineLikeError(error)) {
    return options.offlineMessage;
  }

  if (options.rateLimitMessage) {
    const status = extractHttpStatus(error);
    const code = extractErrorCode(error).toLowerCase();
    if (status === 429 || code.includes("resource-exhausted")) {
      return options.rateLimitMessage;
    }
  }

  if (options.authMessage) {
    const status = extractHttpStatus(error);
    const code = extractErrorCode(error).toLowerCase();
    const message = extractErrorMessage(error).toLowerCase();
    if (status === 401 || status === 403 || code.includes("unauthenticated") || message.includes("unauthenticated")) {
      return options.authMessage;
    }
  }

  if (options.timeoutMessage && isTimeoutLikeError(error)) {
    return options.timeoutMessage;
  }

  return options.genericMessage;
};
