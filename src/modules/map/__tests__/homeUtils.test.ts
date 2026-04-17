/** Purpose: Verify Home map marker composition, snap points, theme selection, and address fallback rules. */
import {
  buildHomeMapMarkers,
  buildHomeMarkerRenderSignature,
  buildGoogleMapsDirectionsUrls,
  HOME_SHEET_SNAP_POINTS,
  resolveHomeAddressLabel,
  resolveHomeMapAppearance,
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
    });

    expect(markers).toEqual([
      expect.objectContaining({
        userId: "user-1",
        isCurrentUser: true,
      }),
      expect.objectContaining({
        userId: "user-2",
        isPrimaryContact: true,
        isCurrentUser: false,
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

  it("builds a stable marker render signature from marker ids and avatar urls", () => {
    expect(
      buildHomeMarkerRenderSignature([
        { markerId: "user-1", photoURL: "https://example.com/a.jpg" },
        { markerId: "user-2", photoURL: " " },
      ]),
    ).toBe("user-1:https://example.com/a.jpg|user-2:initials");
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

  it("chooses system-aware Home appearance", () => {
    expect(resolveHomeMapAppearance("dark")).toBe("dark");
    expect(resolveHomeMapAppearance("light")).toBe("light");
    expect(resolveHomeMapAppearance(null)).toBe("light");
  });

  it("uses stable Home sheet snap points", () => {
    expect(HOME_SHEET_SNAP_POINTS).toEqual(["22%", "48%", "94%"]);
  });
});
