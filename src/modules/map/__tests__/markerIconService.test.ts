/** Purpose: Verify Navigation SDK marker icon cache keys stay tied to visual inputs. */
import { buildMarkerIconCacheKey } from "@/modules/map/markerIconService";

describe("markerIconService", () => {
  it("includes avatar marker visual inputs in the cache key", () => {
    const baseKey = buildMarkerIconCacheKey({
      displayName: "Karlos Galias",
      isCurrentUser: true,
      mapTheme: "light",
      markerId: "user-1",
      photoURL: "https://example.com/avatar.jpg",
    });

    expect(buildMarkerIconCacheKey({
      displayName: "Karlos Galias",
      isCurrentUser: false,
      mapTheme: "light",
      markerId: "user-1",
      photoURL: "https://example.com/avatar.jpg",
    })).not.toBe(baseKey);
    expect(buildMarkerIconCacheKey({
      displayName: "Karlos Galias",
      isCurrentUser: true,
      mapTheme: "dark",
      markerId: "user-1",
      photoURL: "https://example.com/avatar.jpg",
    })).not.toBe(baseKey);
    expect(buildMarkerIconCacheKey({
      displayName: "Karlos Galias",
      isCurrentUser: true,
      mapTheme: "light",
      markerId: "user-1",
      photoURL: "https://example.com/updated.jpg",
    })).not.toBe(baseKey);
  });

  it("keeps center marker cache keys stable across selection while changing with theme", () => {
    const normalKey = buildMarkerIconCacheKey({
      isCenter: true,
      isHighlighted: false,
      mapTheme: "light",
      markerId: "center-1",
    });

    expect(buildMarkerIconCacheKey({
      isCenter: true,
      isHighlighted: true,
      mapTheme: "light",
      markerId: "center-1",
    })).toBe(normalKey);
    expect(buildMarkerIconCacheKey({
      isCenter: true,
      isHighlighted: false,
      mapTheme: "dark",
      markerId: "center-1",
    })).not.toBe(normalKey);
  });
});
