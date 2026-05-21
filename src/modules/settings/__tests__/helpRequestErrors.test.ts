/** Purpose: Verify help/report backend failures are translated into safe user-facing copy. */
import { toProblemReportErrorMessage, toSupportRequestErrorMessage } from "@/modules/settings/helpRequestErrors";

describe("helpRequestErrors", () => {
  it("maps offline failures to reconnect copy", () => {
    expect(toSupportRequestErrorMessage(Object.assign(new Error("Network request failed"), { code: "auth/network-request-failed" }))).toBe(
      "You’re offline right now. Reconnect to the internet and try again.",
    );
  });

  it("maps timeout failures to a plain retry message", () => {
    expect(toProblemReportErrorMessage(new Error("Firestore did not respond in time."))).toBe(
      "That took too long. Please try again in a moment.",
    );
  });

  it("maps unauthenticated failures to sign-in copy", () => {
    expect(
      toSupportRequestErrorMessage({
        isAxiosError: true,
        response: { status: 401 },
      }),
    ).toBe("Please sign in again and try once more.");
  });

  it("falls back to generic copy for unknown failures", () => {
    expect(toProblemReportErrorMessage(new Error("Unexpected failure"))).toBe(
      "We couldn't submit your report right now. Please try again in a moment.",
    );
  });
});

