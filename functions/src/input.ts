/** Purpose: Normalize and sanitize backend inputs before writing or proxying them. */
const NON_DIGIT_REGEX = /\D/g;
const WHITESPACE_REGEX = /\s+/g;

export const OTP_CODE_LENGTH = 6;
export const NAME_MAX_LENGTH = 80;
export const GROUP_NAME_MAX_LENGTH = 80;

export const normalizeWhitespace = (value: string) => value.trim().replace(WHITESPACE_REGEX, " ");

export const normalizeEmail = (value: string) => normalizeWhitespace(value).toLowerCase();

export const normalizeDisplayName = (value: string) => normalizeWhitespace(value);

export const normalizeGroupName = (value: string) => normalizeWhitespace(value);

export const sanitizeNumericCode = (value: unknown, length = OTP_CODE_LENGTH) =>
  String(value ?? "").replace(NON_DIGIT_REGEX, "").slice(0, length);

export const sanitizeOtpCode = (value: unknown) => sanitizeNumericCode(value, OTP_CODE_LENGTH);

export const sanitizeInviteCode = (value: unknown) => sanitizeNumericCode(value, OTP_CODE_LENGTH);
