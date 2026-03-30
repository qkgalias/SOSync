/** Purpose: Validate core onboarding schemas with realistic inputs. */
import {
  emailSignInSchema,
  groupSchema,
  inviteCodeSchema,
  passwordChangeSchema,
  phoneSignInSchema,
  signUpFormSchema,
  verificationCodeSchema,
} from "@/utils/validators";

describe("validators", () => {
  it("accepts a well-formed email sign-in payload", () => {
    const parsed = emailSignInSchema.safeParse({ email: "  Responder@SOSync.App ", password: "12345678" });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.email).toBe("responder@sosync.app");
    }
  });

  it("rejects an invalid phone number", () => {
    expect(phoneSignInSchema.safeParse({ phoneNumber: "ABC123" }).success).toBe(false);
  });

  it("normalizes valid Philippine phone numbers", () => {
    const parsed = phoneSignInSchema.safeParse({ phoneNumber: "0912 345 6789" });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.phoneNumber).toBe("+63 912 345 6789");
    }
  });

  it("requires each create-account field separately", () => {
    expect(
      signUpFormSchema.safeParse({
        firstName: "",
        lastName: "Responder",
        phoneNumber: "",
        email: "invalid",
        password: "123",
        confirmPassword: "456",
      }).success,
    ).toBe(false);
  });

  it("requires a sufficiently descriptive group name", () => {
    expect(groupSchema.safeParse({ name: "HQ" }).success).toBe(false);
    expect(groupSchema.safeParse({ name: "Neighborhood Watch" }).success).toBe(true);
  });

  it("sanitizes invite and verification codes to digits only", () => {
    const invite = inviteCodeSchema.safeParse({ inviteCode: "12a3-45 6" });
    const verification = verificationCodeSchema.safeParse({ code: " 9a8 7-6b5 4" });

    expect(invite.success).toBe(true);
    expect(verification.success).toBe(true);

    if (invite.success && verification.success) {
      expect(invite.data.inviteCode).toBe("123456");
      expect(verification.data.code).toBe("987654");
    }
  });

  it("requires password changes to include the current password and matching confirmation", () => {
    expect(
      passwordChangeSchema.safeParse({
        currentPassword: "",
        nextPassword: "12345678",
        confirmPassword: "12345678",
      }).success,
    ).toBe(false);
    expect(
      passwordChangeSchema.safeParse({
        currentPassword: "old-password",
        nextPassword: "12345678",
        confirmPassword: "87654321",
      }).success,
    ).toBe(false);
  });
});
