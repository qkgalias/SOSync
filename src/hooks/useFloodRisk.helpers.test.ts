/** Purpose: Verify flood-risk cache keys, refresh rules, and severity labels stay stable. */
import {
  buildFloodRiskCacheKey,
  FLOOD_RISK_CACHE_TTL_MS,
  getFloodLevelColors,
  getFloodLevelLabel,
  getFloodRiskErrorMessage,
  shouldRefreshFloodRisk,
} from "@/hooks/useFloodRisk.helpers";

describe("useFloodRisk.helpers", () => {
  it("builds a rounded coordinate cache key", () => {
    expect(buildFloodRiskCacheKey({ latitude: 14.599512, longitude: 120.984231 })).toBe("14.600,120.984");
  });

  it("refreshes stale cache entries", () => {
    const nowSpy = jest.spyOn(Date, "now").mockReturnValue(1_000_000);

    expect(
      shouldRefreshFloodRisk({
        currentLocation: { latitude: 14.6, longitude: 120.98 },
        fetchedAt: 1_000_000 - FLOOD_RISK_CACHE_TTL_MS - 1,
        lastLocation: { latitude: 14.6, longitude: 120.98 },
      }),
    ).toBe(true);

    nowSpy.mockRestore();
  });

  it("refreshes when the user has moved materially even if the cache is still fresh", () => {
    const nowSpy = jest.spyOn(Date, "now").mockReturnValue(1_000_000);

    expect(
      shouldRefreshFloodRisk({
        currentLocation: { latitude: 14.62, longitude: 120.98 },
        fetchedAt: 1_000_000 - 60_000,
        lastLocation: { latitude: 14.6, longitude: 120.98 },
      }),
    ).toBe(true);

    nowSpy.mockRestore();
  });

  it("keeps recent nearby cache entries", () => {
    const nowSpy = jest.spyOn(Date, "now").mockReturnValue(1_000_000);

    expect(
      shouldRefreshFloodRisk({
        currentLocation: { latitude: 14.6005, longitude: 120.9805 },
        fetchedAt: 1_000_000 - 60_000,
        lastLocation: { latitude: 14.6, longitude: 120.98 },
      }),
    ).toBe(false);

    nowSpy.mockRestore();
  });

  it("maps flood levels for the UI", () => {
    expect(getFloodLevelLabel("EXTREME_DANGER")).toBe("EXTREME DANGER");
    expect(getFloodLevelLabel("DANGER")).toBe("DANGER");
    expect(getFloodLevelLabel("WARNING")).toBe("WARNING");
    expect(getFloodLevelLabel("CAUTION")).toBe("CAUTION");
    expect(getFloodLevelLabel("LIMITED_DATA")).toBe("LIMITED DATA");
    expect(getFloodLevelLabel("SAFE")).toBe("SAFE");
  });

  it("returns stable color tokens for flood levels", () => {
    expect(getFloodLevelColors("SAFE").badgeText).toBe("#267C47");
    expect(getFloodLevelColors("DANGER").accent).toBe("#B13A32");
    expect(getFloodLevelColors("LIMITED_DATA").heroBackground).toBe("#F6F3F1");
  });

  it("maps a missing backend route to a friendly deployment message", () => {
    expect(
      getFloodRiskErrorMessage({
        isAxiosError: true,
        response: { status: 404 },
      }),
    ).toBe("We couldn't load local conditions right now. Try again in a moment.");
  });

  it("maps server outages to a friendly retry message", () => {
    expect(
      getFloodRiskErrorMessage({
        isAxiosError: true,
        response: { status: 503 },
      }),
    ).toBe("We couldn't load local conditions right now. Try again in a moment.");
  });

  it("maps flood rate limiting to a specific wait message", () => {
    expect(
      getFloodRiskErrorMessage({
        isAxiosError: true,
        response: { status: 429 },
      }),
    ).toBe("You've refreshed flood outlook too often. Please wait a bit before trying again.");
  });
});
