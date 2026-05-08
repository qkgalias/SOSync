import { isOfflineLikeError, isTimeoutLikeError, toFriendlyBackendErrorMessage } from "@/utils/backendErrors";

describe("backend error helpers", () => {
  it("detects offline-style transport failures", () => {
    expect(isOfflineLikeError(Object.assign(new Error("Network request failed"), { code: "auth/network-request-failed" }))).toBe(true);
  });

  it("detects timeout-style backend failures", () => {
    expect(isTimeoutLikeError(new Error("Firestore did not respond in time."))).toBe(true);
  });

  it("maps offline failures to reconnect copy", () => {
    expect(
      toFriendlyBackendErrorMessage(new Error("Network request failed"), {
        genericMessage: "Generic failure.",
        offlineMessage: "Offline message.",
      }),
    ).toBe("Offline message.");
  });

  it("maps rate limiting to the provided rate-limit copy", () => {
    expect(
      toFriendlyBackendErrorMessage(
        {
          isAxiosError: true,
          response: { status: 429 },
        },
        {
          genericMessage: "Generic failure.",
          offlineMessage: "Offline message.",
          rateLimitMessage: "Rate limit message.",
        },
      ),
    ).toBe("Rate limit message.");
  });

  it("falls back to the generic message for unknown backend failures", () => {
    expect(
      toFriendlyBackendErrorMessage(new Error("Unexpected failure"), {
        genericMessage: "Generic failure.",
        offlineMessage: "Offline message.",
      }),
    ).toBe("Generic failure.");
  });
});
