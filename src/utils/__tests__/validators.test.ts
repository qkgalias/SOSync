/** Purpose: Validate core onboarding schemas with realistic inputs. */
import { emailSignInSchema, groupSchema, phoneSignInSchema } from "@/utils/validators";

describe("validators", () => {
  it("accepts a well-formed email sign-in payload", () => {
    expect(emailSignInSchema.safeParse({ email: "responder@sosync.app", password: "12345678" }).success).toBe(true);
  });

  it("rejects an invalid phone number", () => {
    expect(phoneSignInSchema.safeParse({ phoneNumber: "ABC123" }).success).toBe(false);
  });

  it("requires a sufficiently descriptive group name", () => {
    expect(groupSchema.safeParse({ name: "HQ" }).success).toBe(false);
    expect(groupSchema.safeParse({ name: "Neighborhood Watch" }).success).toBe(true);
  });
});
