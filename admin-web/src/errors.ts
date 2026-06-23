const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const isValidEmail = (email: string) => emailPattern.test(email.trim());

const getErrorCode = (error: unknown) => {
  if (typeof error === "object" && error && "code" in error && typeof error.code === "string") {
    return error.code;
  }
  return "";
};

export const getAuthErrorMessage = (error: unknown) => {
  switch (getErrorCode(error)) {
    case "auth/invalid-email":
      return "Enter a valid email address.";
    case "auth/missing-password":
      return "Enter your password.";
    case "auth/invalid-credential":
    case "auth/user-not-found":
    case "auth/wrong-password":
      return "The email or password is incorrect.";
    case "auth/user-disabled":
      return "This admin account has been disabled.";
    case "auth/too-many-requests":
      return "Too many attempts. Try again later or contact a super admin.";
    case "auth/network-request-failed":
      return "Network error. Check your connection and try again.";
    default:
      return "Unable to sign in. Check your details and try again.";
  }
};

export const getAdminActionErrorMessage = (error: unknown, fallback = "Unable to complete that action. Try again.") => {
  switch (getErrorCode(error)) {
    case "functions/unauthenticated":
      return "Your session expired. Sign in again to continue.";
    case "functions/permission-denied":
      return "You do not have permission to perform this action.";
    case "functions/invalid-argument":
      return "Some information is invalid. Review the form and try again.";
    case "functions/not-found":
      return "This record could not be found. Refresh the page and try again.";
    case "functions/unavailable":
    case "functions/deadline-exceeded":
      return "The admin service is temporarily unavailable. Try again shortly.";
    case "functions/internal":
      return "The admin service had a problem. Try again or contact support.";
    default:
      return fallback;
  }
};
