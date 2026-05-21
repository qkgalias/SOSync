/** Purpose: Keep support and problem-report user-facing failures free of Firebase/Firestore jargon. */
import { toFriendlyBackendErrorMessage } from "@/utils/backendErrors";

const HELP_SUPPORT_GENERIC_MESSAGE = "We couldn't send your support request right now. Please try again in a moment.";
const HELP_REPORT_GENERIC_MESSAGE = "We couldn't submit your report right now. Please try again in a moment.";
const HELP_OFFLINE_MESSAGE = "You’re offline right now. Reconnect to the internet and try again.";
const HELP_AUTH_MESSAGE = "Please sign in again and try once more.";
const HELP_TIMEOUT_MESSAGE = "That took too long. Please try again in a moment.";

export const toSupportRequestErrorMessage = (error: unknown) =>
  toFriendlyBackendErrorMessage(error, {
    authMessage: HELP_AUTH_MESSAGE,
    genericMessage: HELP_SUPPORT_GENERIC_MESSAGE,
    offlineMessage: HELP_OFFLINE_MESSAGE,
    timeoutMessage: HELP_TIMEOUT_MESSAGE,
  });

export const toProblemReportErrorMessage = (error: unknown) =>
  toFriendlyBackendErrorMessage(error, {
    authMessage: HELP_AUTH_MESSAGE,
    genericMessage: HELP_REPORT_GENERIC_MESSAGE,
    offlineMessage: HELP_OFFLINE_MESSAGE,
    timeoutMessage: HELP_TIMEOUT_MESSAGE,
  });

export const SUPPORT_REQUEST_FALLBACK_MESSAGE =
  "We couldn't send your support request in the app, so we opened an email draft instead.";

export const PROBLEM_REPORT_FALLBACK_MESSAGE =
  "We couldn't submit your report in the app, so we opened an email draft instead.";

