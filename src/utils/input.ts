/** Purpose: Normalize and sanitize user-entered email, names, phone numbers, and numeric codes. */
const NON_DIGIT_REGEX = /\D/g;
const WHITESPACE_REGEX = /\s+/g;

export const OTP_CODE_LENGTH = 6;
export const NAME_MAX_LENGTH = 80;
export const GROUP_NAME_MAX_LENGTH = 80;
export const PH_PHONE_LOCAL_LENGTH = 10;

export const normalizeWhitespace = (value: string) => value.trim().replace(WHITESPACE_REGEX, " ");

export const normalizeEmail = (value: string) => normalizeWhitespace(value).toLowerCase();

export const normalizeDisplayName = (value: string) => normalizeWhitespace(value);

export const normalizeGroupName = (value: string) => normalizeWhitespace(value);

export const sanitizeNumericCode = (value: string, length = OTP_CODE_LENGTH) =>
  String(value ?? "").replace(NON_DIGIT_REGEX, "").slice(0, length);

export const sanitizeOtpCode = (value: string) => sanitizeNumericCode(value, OTP_CODE_LENGTH);

export const sanitizeInviteCode = (value: string) => sanitizeNumericCode(value, OTP_CODE_LENGTH);

export const normalizePhoneDigits = (value: string) => {
  let digits = String(value ?? "").replace(NON_DIGIT_REGEX, "");

  if (digits.startsWith("63")) {
    digits = digits.slice(2);
  }

  digits = digits.replace(/^0+/, "");
  return digits.slice(0, PH_PHONE_LOCAL_LENGTH);
};

export const formatPhoneDigits = (value: string) => {
  const digits = normalizePhoneDigits(value);
  if (!digits) {
    return "";
  }

  return [digits.slice(0, 3), digits.slice(3, 6), digits.slice(6, PH_PHONE_LOCAL_LENGTH)]
    .filter(Boolean)
    .join(" ");
};

export const normalizePhoneNumber = (value: string) => {
  const digits = normalizePhoneDigits(value);
  if (digits.length !== PH_PHONE_LOCAL_LENGTH) {
    return normalizeWhitespace(value);
  }

  return `+63 ${formatPhoneDigits(digits)}`;
};
