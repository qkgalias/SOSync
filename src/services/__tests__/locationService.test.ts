/** Purpose: Verify Android location acquisition prefers fresh provider fixes over stale cached coordinates. */
const mockLocation = {
  Accuracy: {
    Balanced: 3,
    High: 4,
  },
  enableNetworkProviderAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  getForegroundPermissionsAsync: jest.fn(),
  getLastKnownPositionAsync: jest.fn(),
  requestForegroundPermissionsAsync: jest.fn(),
  reverseGeocodeAsync: jest.fn(),
  watchPositionAsync: jest.fn(),
};

jest.mock("expo-location", () => ({
  __esModule: true,
  ...mockLocation,
}));

jest.mock("react-native", () => ({
  Platform: {
    OS: "android",
  },
}));

describe("locationService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocation.enableNetworkProviderAsync.mockResolvedValue(undefined);
    mockLocation.getForegroundPermissionsAsync.mockResolvedValue({ status: "granted" });
    mockLocation.getLastKnownPositionAsync.mockResolvedValue({
      coords: {
        accuracy: 15,
        latitude: 14.5995,
        longitude: 120.9842,
      },
      timestamp: Date.now() - 60_000,
    });
  });

  it("asks Android for a fresh high-accuracy fix before using last-known coordinates", async () => {
    const currentLocation = {
      coords: {
        accuracy: 5,
        latitude: 10.2635,
        longitude: 123.8395,
      },
      timestamp: Date.now(),
    };
    mockLocation.getCurrentPositionAsync.mockResolvedValue(currentLocation);

    const { locationService } = require("@/services/locationService") as typeof import("@/services/locationService");
    const result = await locationService.getCurrentPosition();

    expect(result).toBe(currentLocation);
    expect(mockLocation.enableNetworkProviderAsync).toHaveBeenCalledTimes(1);
    expect(mockLocation.getCurrentPositionAsync).toHaveBeenCalledWith({ accuracy: mockLocation.Accuracy.High });
    expect(mockLocation.getLastKnownPositionAsync).not.toHaveBeenCalled();
  });

  it("falls back to last-known coordinates when active Android providers fail", async () => {
    const lastKnownLocation = {
      coords: {
        accuracy: 15,
        latitude: 10.2635,
        longitude: 123.8395,
      },
      timestamp: Date.now() - 60_000,
    };
    mockLocation.getCurrentPositionAsync.mockRejectedValue(new Error("provider unavailable"));
    mockLocation.watchPositionAsync.mockRejectedValue(new Error("watch unavailable"));
    mockLocation.getLastKnownPositionAsync.mockResolvedValue(lastKnownLocation);

    const { locationService } = require("@/services/locationService") as typeof import("@/services/locationService");
    const result = await locationService.getCurrentPosition();

    expect(result).toBe(lastKnownLocation);
    expect(mockLocation.getLastKnownPositionAsync).toHaveBeenCalledWith({
      maxAge: 6 * 60 * 60 * 1000,
      requiredAccuracy: 500,
    });
  });

  it("uses high accuracy for Android watch subscriptions", async () => {
    const subscription = { remove: jest.fn() };
    mockLocation.watchPositionAsync.mockResolvedValue(subscription);

    const { locationService } = require("@/services/locationService") as typeof import("@/services/locationService");
    const onUpdate = jest.fn();
    const result = await locationService.watchPosition(onUpdate);

    expect(result).toBe(subscription);
    expect(mockLocation.enableNetworkProviderAsync).toHaveBeenCalledTimes(1);
    expect(mockLocation.watchPositionAsync).toHaveBeenCalledWith(
      {
        accuracy: mockLocation.Accuracy.High,
        distanceInterval: 50,
        timeInterval: 15_000,
      },
      onUpdate,
    );
  });
});
