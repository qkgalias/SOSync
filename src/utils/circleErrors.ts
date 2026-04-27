/** Purpose: Convert callable circle errors into safe, user-facing messages. */
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

export const toFriendlyJoinCircleError = (error: unknown) => {
  const code = extractErrorCode(error);
  const message = extractErrorMessage(error);
  const normalizedMessage = message.trim().toLowerCase();

  if (code === "functions/not-found" || normalizedMessage.includes("not found")) {
    return "We could not find a circle with that code. Check the 6 digits and try again.";
  }

  if (code === "functions/invalid-argument" || normalizedMessage.includes("invalid")) {
    return "Enter a valid 6-digit circle code.";
  }

  if (code === "functions/unauthenticated" || normalizedMessage.includes("unauthenticated")) {
    return "Your session expired. Sign in again before joining a circle.";
  }

  if (code === "functions/deadline-exceeded" || normalizedMessage.includes("deadline")) {
    return "Joining took too long. Check your connection and try again.";
  }

  if (code === "functions/internal" || normalizedMessage === "internal") {
    return "We could not join that circle right now. Check the code and try again.";
  }

  return message || "Unable to join the trusted circle right now.";
};
