/** Purpose: Validate auth, profile, and group forms before service calls are made. */
import { z } from "zod";

import {
  GROUP_NAME_MAX_LENGTH,
  NAME_MAX_LENGTH,
  normalizeDisplayName,
  normalizeEmail,
  normalizeGroupName,
  normalizePhoneNumber,
  sanitizeSignupName,
  sanitizeInviteCode,
  sanitizeOtpCode,
} from "@/utils/input";

const normalizedEmailSchema = z.preprocess(
  (value) => normalizeEmail(String(value ?? "")),
  z
    .string()
    .min(1, "Enter your email.")
    .email("Enter a valid email address.")
    .max(254, "Email address is too long."),
);

const normalizedPhoneSchema = z.preprocess(
  (value) => normalizePhoneNumber(String(value ?? "")),
  z
    .string()
    .min(1, "Enter your phone number.")
    .regex(/^\+63 \d{3} \d{3} \d{4}$/, "Enter a valid Philippine mobile number."),
);

const normalizedNameSchema = z.preprocess(
  (value) => normalizeDisplayName(String(value ?? "")),
  z
    .string()
    .min(2, "Display name must be at least 2 characters.")
    .max(NAME_MAX_LENGTH, `Display name must be ${NAME_MAX_LENGTH} characters or fewer.`),
);

const normalizedSignupNameSchema = (fieldName: "First name" | "Last name") =>
  z.preprocess(
    (value) => normalizeDisplayName(String(value ?? "")),
    z
      .string()
      .min(1, `Enter your ${fieldName.toLowerCase()}.`)
      .max(NAME_MAX_LENGTH, `${fieldName} must be ${NAME_MAX_LENGTH} characters or fewer.`)
      .regex(/^[\p{L}\p{M} ]+$/u, `${fieldName} can only include letters and spaces.`)
      .refine((value) => sanitizeSignupName(value) === value, `${fieldName} can only include letters and spaces.`),
  );

const signupEmailSchema = normalizedEmailSchema.refine(
  (email) => email.split("@")[1] === "gmail.com",
  "Use a Gmail address ending in @gmail.com.",
);

const signupPasswordSchema = z
  .string()
  .min(1, "Enter your password.")
  .min(12, "Password must be at least 12 characters.")
  .max(64, "Password must be 64 characters or fewer.")
  .refine((value) => /[A-Z]/.test(value), "Password must include at least one uppercase letter.");

const normalizedGroupNameSchema = z.preprocess(
  (value) => normalizeGroupName(String(value ?? "")),
  z
    .string()
    .min(3, "Circle name must be at least 3 characters.")
    .max(GROUP_NAME_MAX_LENGTH, `Circle name must be ${GROUP_NAME_MAX_LENGTH} characters or fewer.`),
);

export const emailSignInSchema = z.object({
  email: normalizedEmailSchema,
  password: z
    .string()
    .min(1, "Enter your password.")
    .min(8, "Password must be at least 8 characters."),
});

export const passwordResetSchema = z.object({
  email: normalizedEmailSchema,
});

export const phoneSignInSchema = z.object({
  phoneNumber: normalizedPhoneSchema,
});

export const signUpSchema = emailSignInSchema.extend({
  name: normalizedNameSchema,
});

export const signUpFormSchema = z
  .object({
    firstName: normalizedSignupNameSchema("First name"),
    lastName: normalizedSignupNameSchema("Last name"),
    phoneNumber: phoneSignInSchema.shape.phoneNumber,
    email: signupEmailSchema,
    password: signupPasswordSchema,
    confirmPassword: z.string().min(1, "Confirm your password."),
    acceptedLegalTerms: z
      .boolean()
      .refine((accepted) => accepted, "Agree to the Terms of Service and Privacy Policy to continue."),
  })
  .superRefine(({ confirmPassword, password }, ctx) => {
    if (confirmPassword && confirmPassword !== password) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirmPassword"],
        message: "Passwords do not match.",
      });
    }
  });

export const profileSchema = z.object({
  name: normalizedNameSchema,
  email: normalizedEmailSchema,
  phoneNumber: normalizedPhoneSchema,
});

export const contactDetailsSchema = z.object({
  name: normalizedNameSchema,
  phoneNumber: normalizedPhoneSchema,
});

export const groupSchema = z.object({
  name: normalizedGroupNameSchema,
});

export const inviteCodeSchema = z.object({
  inviteCode: z.preprocess(
    (value) => sanitizeInviteCode(String(value ?? "")),
    z.string().length(6, "Enter a valid 6-digit circle code."),
  ),
});

export const verificationCodeSchema = z.object({
  code: z.preprocess(
    (value) => sanitizeOtpCode(String(value ?? "")),
    z.string().length(6, "Enter the 6-digit verification code."),
  ),
});

export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password."),
    nextPassword: emailSignInSchema.shape.password,
    confirmPassword: z.string().min(1, "Confirm your new password."),
  })
  .superRefine(({ confirmPassword, nextPassword }, ctx) => {
    if (confirmPassword && confirmPassword !== nextPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirmPassword"],
        message: "New passwords do not match.",
      });
    }
  });
