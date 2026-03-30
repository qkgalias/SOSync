/** Purpose: Verify shared input normalization helpers for auth and onboarding flows. */
import {
  formatPhoneDigits,
  normalizeDisplayName,
  normalizeEmail,
  normalizeGroupName,
  normalizePhoneNumber,
  sanitizeInviteCode,
  sanitizeOtpCode,
} from "@/utils/input";

describe("input helpers", () => {
  it("normalizes emails to lowercase trimmed values", () => {
    expect(normalizeEmail("  RESCUER@SOSync.App ")).toBe("rescuer@sosync.app");
  });

  it("collapses repeated whitespace in names", () => {
    expect(normalizeDisplayName("  Maria   Clara  Cruz ")).toBe("Maria Clara Cruz");
    expect(normalizeGroupName("  Family   Response   Circle ")).toBe("Family Response Circle");
  });

  it("formats canonical Philippine mobile numbers", () => {
    expect(formatPhoneDigits("09123456789")).toBe("912 345 6789");
    expect(normalizePhoneNumber("+63 (912) 345-6789")).toBe("+63 912 345 6789");
  });

  it("keeps numeric codes digit-only and capped to six characters", () => {
    expect(sanitizeInviteCode("12a3-45 678")).toBe("123456");
    expect(sanitizeOtpCode("abc987654")).toBe("987654");
  });
});
