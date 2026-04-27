/** Purpose: Ensure circle join failures never expose raw callable error codes. */
import { toFriendlyJoinCircleError } from "@/utils/circleErrors";

describe("circle error helpers", () => {
  it("maps raw internal callable failures to helpful join-circle copy", () => {
    expect(toFriendlyJoinCircleError(Object.assign(new Error("INTERNAL"), { code: "functions/internal" }))).toBe(
      "We could not join that circle right now. Check the code and try again.",
    );
  });

  it("maps missing invite codes to a retryable user message", () => {
    expect(toFriendlyJoinCircleError(Object.assign(new Error("Circle code not found."), { code: "functions/not-found" }))).toBe(
      "We could not find a circle with that code. Check the 6 digits and try again.",
    );
  });
});
