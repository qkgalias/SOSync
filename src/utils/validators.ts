/** Purpose: Validate auth, profile, and group forms before service calls are made. */
import { z } from "zod";

export const emailSignInSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export const phoneSignInSchema = z.object({
  phoneNumber: z
    .string()
    .min(10, "Phone number looks too short.")
    .regex(/^[+\d][\d\s-]+$/, "Use digits, spaces, or a leading + only."),
});

export const signUpSchema = emailSignInSchema.extend({
  name: z.string().min(2, "Name must be at least 2 characters."),
});

export const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  email: z.string().email().optional().or(z.literal("")),
  phoneNumber: z.string().optional(),
});

export const groupSchema = z.object({
  name: z.string().min(3, "Circle name must be at least 3 characters."),
});

export const inviteSchema = z.object({
  contact: z.string().min(3, "Add an email or phone number."),
  channel: z.enum(["share", "sms", "email"]),
});
