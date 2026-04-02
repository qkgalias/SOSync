/** Purpose: Verify pure HTTP security helpers used by Cloud Functions routes. */
import {
  buildRateLimitDocId,
  coerceCoordinate,
  extractBearerToken,
  extractForwardedIp,
  resolveRateLimitWindow,
} from "../functions/src/httpValidation";

describe("functions http validation", () => {
  it("extracts bearer tokens from authorization headers", () => {
    expect(extractBearerToken("Bearer abc.def.ghi")).toBe("abc.def.ghi");
    expect(extractBearerToken("bearer test-token")).toBe("test-token");
    expect(extractBearerToken("Token nope")).toBe("");
  });

  it("extracts the first forwarded IP address", () => {
    expect(extractForwardedIp("203.0.113.1, 70.41.3.18")).toBe("203.0.113.1");
  });

  it("rejects out-of-range coordinates", () => {
    expect(coerceCoordinate(14.5, -90, 90)).toBe(14.5);
    expect(coerceCoordinate(181, -180, 180)).toBeNull();
    expect(coerceCoordinate("invalid", -90, 90)).toBeNull();
  });

  it("derives fixed windows and stable rate-limit document ids", () => {
    const window = resolveRateLimitWindow(301_000, 300_000);
    expect(window.windowStartedAt).toBe(300_000);
    expect(window.resetAt).toBe(600_000);
    expect(window.retryAfterSeconds).toBe(299);
    expect(buildRateLimitDocId("getEvacuationRoute", "user:abc", window.windowStartedAt)).toHaveLength(64);
  });
});
