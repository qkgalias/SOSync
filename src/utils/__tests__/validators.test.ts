/** Purpose: Validate core onboarding schemas with realistic inputs. */
import {
  emailSignInSchema,
  groupSchema,
  inviteCodeSchema,
  passwordChangeSchema,
  passwordResetSchema,
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

  it("accepts and normalizes a password-reset email", () => {
    const parsed = passwordResetSchema.safeParse({ email: "  Responder@SOSync.App " });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.email).toBe("responder@sosync.app");
    }
  });

  it("rejects an invalid password-reset email", () => {
    expect(passwordResetSchema.safeParse({ email: "not-an-email" }).success).toBe(false);
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
        password: "short",
        confirmPassword: "456",
        acceptedLegalTerms: false,
      }).success,
    ).toBe(false);
  });

  it("accepts normalized Gmail signup data with letters and spaces", () => {
    const parsed = signUpFormSchema.safeParse({
      firstName: "  Juan Pedro ",
      lastName: "Dela Cruz Ñ",
      phoneNumber: "0912 345 6789",
      email: " USER@GMAIL.COM ",
      password: "LongpasswordA",
      confirmPassword: "LongpasswordA",
      acceptedLegalTerms: true,
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.firstName).toBe("Juan Pedro");
      expect(parsed.data.lastName).toBe("Dela Cruz Ñ");
      expect(parsed.data.email).toBe("user@gmail.com");
    }
  });

  it("rejects signup names with numbers", () => {
    expect(
      signUpFormSchema.safeParse({
        firstName: "Jake1",
        lastName: "Responder",
        phoneNumber: "0912 345 6789",
        email: "user@gmail.com",
        password: "LongpasswordA",
        confirmPassword: "LongpasswordA",
        acceptedLegalTerms: true,
      }).success,
    ).toBe(false);
    expect(
      signUpFormSchema.safeParse({
        firstName: "Jake",
        lastName: "Responder2",
        phoneNumber: "0912 345 6789",
        email: "user@gmail.com",
        password: "LongpasswordA",
        confirmPassword: "LongpasswordA",
        acceptedLegalTerms: true,
      }).success,
    ).toBe(false);
  });

  it("rejects signup names with punctuation or symbols", () => {
    for (const [firstName, lastName] of [
      ["Juan-Pedro", "Responder"],
      ["ONeil", "Dela.Cruz"],
      ["Jake!", "Responder"],
      ["Jake@", "Responder"],
    ]) {
      expect(
        signUpFormSchema.safeParse({
          firstName,
          lastName,
          phoneNumber: "0912 345 6789",
          email: "user@gmail.com",
          password: "LongpasswordA",
          confirmPassword: "LongpasswordA",
          acceptedLegalTerms: true,
        }).success,
      ).toBe(false);
    }
  });

  it("requires gmail.com only for new signup email", () => {
    for (const email of ["user@yahoo.com", "user@googlemail.com", "not-an-email"]) {
      expect(
        signUpFormSchema.safeParse({
          firstName: "Jake",
          lastName: "Responder",
          phoneNumber: "0912 345 6789",
          email,
          password: "LongpasswordA",
          confirmPassword: "LongpasswordA",
          acceptedLegalTerms: true,
        }).success,
      ).toBe(false);
    }
  });

  it("requires stronger signup password length and uppercase rules", () => {
    const basePayload = {
      firstName: "Jake",
      lastName: "Responder",
      phoneNumber: "0912 345 6789",
      email: "user@gmail.com",
      confirmPassword: "",
      acceptedLegalTerms: true,
    };

    expect(
      signUpFormSchema.safeParse({
        ...basePayload,
        password: "ShortpassA",
        confirmPassword: "ShortpassA",
      }).success,
    ).toBe(false);
    expect(
      signUpFormSchema.safeParse({
        ...basePayload,
        password: "a".repeat(65) + "A",
        confirmPassword: "a".repeat(65) + "A",
      }).success,
    ).toBe(false);
    expect(
      signUpFormSchema.safeParse({
        ...basePayload,
        password: "longpasswordonly",
        confirmPassword: "longpasswordonly",
      }).success,
    ).toBe(false);
    expect(
      signUpFormSchema.safeParse({
        ...basePayload,
        password: "LongpasswordA",
        confirmPassword: "LongpasswordA",
      }).success,
    ).toBe(true);
  });

  it("requires explicit legal agreement for signup", () => {
    expect(
      signUpFormSchema.safeParse({
        firstName: "Jake",
        lastName: "Responder",
        phoneNumber: "0912 345 6789",
        email: "user@gmail.com",
        password: "LongpasswordA",
        confirmPassword: "LongpasswordA",
        acceptedLegalTerms: false,
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
