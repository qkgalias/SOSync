/** Purpose: Convert low-level SOS send failures into calm, user-friendly footer copy. */

export const SOS_OFFLINE_MESSAGE = "You're offline right now. Reconnect to the internet, then try sending the SOS again.";
export const SOS_GENERIC_SEND_FAILURE_MESSAGE = "We couldn't send your SOS right now. Please try again in a moment.";

type ResolveSosSendErrorMessageInput = {
  error: unknown;
  isOffline?: boolean;
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

export const resolveSosSendErrorMessage = ({ error, isOffline = false }: ResolveSosSendErrorMessageInput) => {
  if (isOffline) {
    return SOS_OFFLINE_MESSAGE;
  }

  const code = extractErrorCode(error).toLowerCase();
  const message = extractErrorMessage(error).toLowerCase();

  const looksOffline =
    code.includes("unavailable") ||
    code.includes("network-request-failed") ||
    message.includes("network request failed") ||
    message.includes("offline");

  if (looksOffline) {
    return SOS_OFFLINE_MESSAGE;
  }

  const looksTimedOut =
    code.includes("deadline-exceeded") ||
    code.includes("timeout") ||
    message.includes("did not respond in time") ||
    message.includes("deadline exceeded") ||
    message.includes("timed out");

  if (looksTimedOut) {
    return SOS_OFFLINE_MESSAGE;
  }

  return SOS_GENERIC_SEND_FAILURE_MESSAGE;
};
