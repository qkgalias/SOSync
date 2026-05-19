/** Purpose: Verify Home map marker composition, snap points, theme selection, and address fallback rules. */
import {
  buildHomeMapMarkers,
  buildHomeMarkerRenderSignature,
  formatLastSeenLabel,
  getLastSeenMinutes,
  buildGoogleMapsDirectionsUrls,
  HOME_SHEET_SNAP_POINTS,
  MEMBER_OFFLINE_THRESHOLD_MS,
  NEARBY_SAFETY_HUB_MAX_DISTANCE_METERS,
  resolveHomeMarkerDisplayName,
  resolveHomeAddressLabel,
  resolveHomeMapAppearance,
  resolveMemberPresenceStatus,
  sortNearbySafetyHubs,
  sanitizeHomeMarkerPhotoURL,
} from "@/modules/map/homeUtils";

describe("homeUtils", () => {
  it("builds markers from the current user and visible group locations", () => {
    const markers = buildHomeMapMarkers({
      currentUser: {
        userId: "user-1",
        displayName: "Karlos Galias",
        photoURL: "https://example.com/karlos.jpg",
        role: "admin",
      },
      currentLocation: { latitude: 10.3, longitude: 123.9 },
      members: [
        {
          userId: "user-2",
          groupId: "group-1",
          displayName: "Aaron Sabado",
          role: "member",
          joinedAt: "2026-03-22T00:00:00.000Z",
          photoURL: "https://example.com/aaron.jpg",
        },
        {
          userId: "user-3",
          groupId: "group-1",
          displayName: "Blocked Friend",
          role: "member",
          joinedAt: "2026-03-22T00:00:00.000Z",
        },
      ],
      groupLocations: [
        {
          locationId: "group-1_user-2",
          userId: "user-2",
          groupId: "group-1",
          latitude: 10.31,
          longitude: 123.91,
          updatedAt: "2026-03-22T00:00:00.000Z",
          sharingState: "live",
        },
        {
          locationId: "group-1_user-3",
          userId: "user-3",
          groupId: "group-1",
          latitude: 10.32,
          longitude: 123.92,
          updatedAt: "2026-03-22T00:00:00.000Z",
          sharingState: "live",
        },
        {
          locationId: "group-1_user-4",
          userId: "user-4",
          groupId: "group-1",
          latitude: 10.33,
          longitude: 123.93,
          updatedAt: "2026-03-22T00:00:00.000Z",
          sharingState: "paused",
        },
      ],
      blockedUserIds: ["user-3"],
      primaryContactIds: ["user-2"],
      nowMs: Date.parse("2026-03-22T00:09:00.000Z"),
    });

    expect(markers).toEqual([
      expect.objectContaining({
        userId: "user-1",
        isCurrentUser: true,
        presenceStatus: "live",
      }),
      expect.objectContaining({
        userId: "user-2",
        isPrimaryContact: true,
        isCurrentUser: false,
        presenceStatus: "live",
      }),
    ]);
  });

  it("never filters out the current user marker even if the block list contains the same user id", () => {
    const markers = buildHomeMapMarkers({
      currentUser: {
        userId: "user-1",
        displayName: "Karlos Galias",
      },
      currentLocation: { latitude: 10.3, longitude: 123.9 },
      members: [],
      groupLocations: [],
      blockedUserIds: ["user-1"],
    });

    expect(markers).toEqual([
      expect.objectContaining({
        isCurrentUser: true,
        userId: "user-1",
      }),
    ]);
  });

  it("normalizes empty avatar URLs before creating markers", () => {
    const markers = buildHomeMapMarkers({
      currentUser: {
        userId: "user-1",
        displayName: "Karlos Galias",
        photoURL: "   ",
      },
      currentLocation: { latitude: 10.3, longitude: 123.9 },
      members: [
        {
          userId: "user-2",
          groupId: "group-1",
          displayName: "Aaron Sabado",
          role: "member",
          joinedAt: "2026-03-22T00:00:00.000Z",
          photoURL: " ",
        },
      ],
      groupLocations: [
        {
          locationId: "group-1_user-2",
          userId: "user-2",
          groupId: "group-1",
          latitude: 10.31,
          longitude: 123.91,
          updatedAt: "2026-03-22T00:00:00.000Z",
          sharingState: "live",
        },
      ],
    });

    expect(markers).toEqual([
      expect.objectContaining({ photoURL: undefined, userId: "user-1" }),
      expect.objectContaining({ photoURL: undefined, userId: "user-2" }),
    ]);
  });

  it("keeps marker display names non-empty", () => {
    const markers = buildHomeMapMarkers({
      currentUser: {
        userId: "user-1",
        displayName: " ",
      },
      currentLocation: { latitude: 10.3, longitude: 123.9 },
      members: [
        {
          userId: "user-2",
          groupId: "group-1",
          displayName: "",
          role: "member",
          joinedAt: "2026-03-22T00:00:00.000Z",
        },
      ],
      groupLocations: [
        {
          locationId: "group-1_user-2",
          userId: "user-2",
          groupId: "group-1",
          latitude: 10.31,
          longitude: 123.91,
          updatedAt: "2026-03-22T00:00:00.000Z",
          sharingState: "live",
        },
      ],
    });

    expect(markers).toEqual([
      expect.objectContaining({ displayName: "SOSync", userId: "user-1" }),
      expect.objectContaining({ displayName: "Circle member", userId: "user-2" }),
    ]);
  });

  it("resolves marker display names with a caller-provided fallback", () => {
    expect(resolveHomeMarkerDisplayName(" Karlos Galias ", "Fallback")).toBe("Karlos Galias");
    expect(resolveHomeMarkerDisplayName(" ", "Fallback")).toBe("Fallback");
  });

  it("builds a stable marker render signature from marker ids and avatar urls", () => {
    expect(
      buildHomeMarkerRenderSignature([
        { markerId: "user-1", photoURL: "https://example.com/a.jpg", presenceStatus: "live" },
        { markerId: "user-2", photoURL: " ", presenceStatus: "offline" },
      ]),
    ).toBe("user-1:https://example.com/a.jpg:live|user-2:initials:offline");
  });

  it("marks stale live member locations as offline with last-seen minutes", () => {
    const updatedAt = "2026-03-22T00:00:00.000Z";
    const nowMs = Date.parse("2026-03-22T00:12:00.000Z");
    const markers = buildHomeMapMarkers({
      currentUser: {
        userId: "user-1",
        displayName: "Karlos Galias",
      },
      currentLocation: { latitude: 10.3, longitude: 123.9 },
      members: [
        {
          userId: "user-2",
          groupId: "group-1",
          displayName: "Aaron Sabado",
          role: "member",
          joinedAt: "2026-03-22T00:00:00.000Z",
        },
      ],
      groupLocations: [
        {
          locationId: "group-1_user-2",
          userId: "user-2",
          groupId: "group-1",
          latitude: 10.31,
          longitude: 123.91,
          updatedAt,
          sharingState: "live",
        },
      ],
      nowMs,
    });

    expect(markers.find((marker) => marker.userId === "user-2")).toEqual(
      expect.objectContaining({
        lastSeenAt: updatedAt,
        lastSeenMinutes: 12,
        presenceStatus: "offline",
      }),
    );
  });

  it("resolves member presence from sharing state and last location age", () => {
    const nowMs = Date.parse("2026-03-22T00:12:00.000Z");
    const freshUpdatedAt = new Date(nowMs - MEMBER_OFFLINE_THRESHOLD_MS).toISOString();
    const staleUpdatedAt = new Date(nowMs - MEMBER_OFFLINE_THRESHOLD_MS - 1).toISOString();

    expect(resolveMemberPresenceStatus({ sharingState: "live", updatedAt: freshUpdatedAt }, nowMs)).toBe("live");
    expect(resolveMemberPresenceStatus({ sharingState: "live", updatedAt: staleUpdatedAt }, nowMs)).toBe("offline");
    expect(resolveMemberPresenceStatus({ sharingState: "paused", updatedAt: staleUpdatedAt }, nowMs)).toBe("live");
    expect(resolveMemberPresenceStatus({ sharingState: "live", updatedAt: "not-a-date" }, nowMs)).toBe("offline");
  });

  it("formats last-seen labels for member offline states", () => {
    expect(getLastSeenMinutes("2026-03-22T00:00:00.000Z", Date.parse("2026-03-22T00:12:00.000Z"))).toBe(12);
    expect(formatLastSeenLabel(null)).toBe("last seen recently");
    expect(formatLastSeenLabel(0)).toBe("last seen just now");
    expect(formatLastSeenLabel(12)).toBe("last seen 12m ago");
    expect(formatLastSeenLabel(65)).toBe("last seen 1h ago");
  });

  it("sanitizes empty marker photo urls", () => {
    expect(sanitizeHomeMarkerPhotoURL(" https://example.com/a.jpg ")).toBe("https://example.com/a.jpg");
    expect(sanitizeHomeMarkerPhotoURL(" ")).toBeUndefined();
    expect(sanitizeHomeMarkerPhotoURL(undefined)).toBeUndefined();
  });

  it("builds Google Maps directions URLs from origin and destination", () => {
    const urls = buildGoogleMapsDirectionsUrls({
      destination: { latitude: 10.4, longitude: 124 },
      origin: { latitude: 10.3, longitude: 123.9 },
    });

    expect(urls.webUrl).toBe(
      "https://www.google.com/maps/dir/?api=1&origin=10.3%2C123.9&destination=10.4%2C124",
    );
    expect(urls.appUrl).toContain("10.4");
    expect(urls.appUrl).toContain("124");
  });

  it("builds Google Maps directions URLs with destination only", () => {
    const urls = buildGoogleMapsDirectionsUrls({
      destination: { latitude: 10.4, longitude: 124 },
    });

    expect(urls.webUrl).toBe("https://www.google.com/maps/dir/?api=1&destination=10.4%2C124");
    expect(urls.appUrl).toContain("10.4%2C124");
  });

  it("prefers reverse geocoding, then center address, then group name", () => {
    expect(
      resolveHomeAddressLabel({
        reverseGeocodedAddress: "Mansueto Rd, Tabunoc",
        nearestCenterAddress: "Fallback Safety Hub",
        groupName: "Family Circle",
      }),
    ).toBe("Mansueto Rd, Tabunoc");

    expect(
      resolveHomeAddressLabel({
        reverseGeocodedAddress: " ",
        nearestCenterAddress: "Fallback Safety Hub",
        groupName: "Family Circle",
      }),
    ).toBe("Fallback Safety Hub");

    expect(resolveHomeAddressLabel({ groupName: "Family Circle" })).toBe("Family Circle");
  });

  it("keeps only safety hubs within 2 km and sorts nearest to farthest", () => {
    const hubs = sortNearbySafetyHubs(
      [
        {
          centerId: "far",
          distanceMeters: 2_001,
          latitude: 10.4,
          longitude: 123.95,
          name: "Far Hub",
        },
        {
          centerId: "near",
          distanceMeters: 850,
          latitude: 10.31,
          longitude: 123.91,
          name: "Near Hub",
        },
        {
          centerId: "mid",
          distanceMeters: 1_600,
          latitude: 10.35,
          longitude: 123.93,
          name: "Mid Hub",
        },
        {
          centerId: "edge",
          distanceMeters: NEARBY_SAFETY_HUB_MAX_DISTANCE_METERS,
          latitude: 10.35,
          longitude: 123.94,
          name: "Edge Hub",
        },
      ],
      { latitude: 10.3, longitude: 123.9 },
    );

    expect(hubs.map((hub) => hub.centerId)).toEqual(["near", "mid", "edge"]);
  });

  it("respects backend-provided safety hub distance before coordinate fallback", () => {
    const hubs = sortNearbySafetyHubs(
      [
        {
          centerId: "provided-near",
          distanceMeters: 500,
          latitude: 14.5995,
          longitude: 120.9842,
          name: "Provided Near Hub",
        },
        {
          centerId: "provided-far",
          distanceMeters: 2_500,
          latitude: 10.3001,
          longitude: 123.9001,
          name: "Provided Far Hub",
        },
      ],
      { latitude: 10.3, longitude: 123.9 },
    );

    expect(hubs.map((hub) => hub.centerId)).toEqual(["provided-near"]);
    expect(hubs[0]).toEqual(expect.objectContaining({ distanceMeters: 500 }));
  });

  it("falls back to local distance when safety hub distance is missing", () => {
    const hubs = sortNearbySafetyHubs(
      [
        {
          centerId: "fallback-near",
          latitude: 10.3005,
          longitude: 123.9005,
          name: "Fallback Near Hub",
        },
        {
          centerId: "fallback-far",
          latitude: 10.34,
          longitude: 123.94,
          name: "Fallback Far Hub",
        },
      ],
      { latitude: 10.3, longitude: 123.9 },
    );

    expect(hubs.map((hub) => hub.centerId)).toEqual(["fallback-near"]);
    expect(hubs[0]?.distanceMeters).toEqual(expect.any(Number));
    expect(hubs[0]?.distanceMeters).toBeLessThanOrEqual(NEARBY_SAFETY_HUB_MAX_DISTANCE_METERS);
  });

  it("chooses system-aware Home appearance", () => {
    expect(resolveHomeMapAppearance("dark")).toBe("dark");
    expect(resolveHomeMapAppearance("light")).toBe("light");
    expect(resolveHomeMapAppearance(null)).toBe("light");
  });

  it("uses stable Home sheet snap points", () => {
    expect(HOME_SHEET_SNAP_POINTS).toEqual(["22%", "48%", "94%"]);
  });
});
