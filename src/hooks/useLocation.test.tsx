/** Purpose: Verify location startup stays one-shot and does not loop on repeated updates. */
import { useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, render, waitFor } from "@testing-library/react-native";
import type { LocationObject } from "expo-location";

import { useLocation } from "@/hooks/useLocation";
import { apiService } from "@/services/apiService";
import { firestoreService } from "@/services/firestoreService";
import { locationService } from "@/services/locationService";

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

jest.mock("@/services/firestoreService", () => ({
  firestoreService: {
    listenToLocations: jest.fn(),
    upsertLocation: jest.fn(),
  },
}));

jest.mock("@/services/apiService", () => ({
  apiService: {
    getNearbyEvacuationCenters: jest.fn(),
  },
}));

jest.mock("@/services/locationService", () => ({
  locationService: {
    requestPermission: jest.fn(),
    watchPosition: jest.fn(),
    getCurrentPosition: jest.fn(),
    getNearestCenter: jest.fn(),
    distanceBetween: jest.fn(),
  },
}));

const mockedAsyncStorage = jest.mocked(AsyncStorage);
const mockedApiService = jest.mocked(apiService);
const mockedFirestoreService = jest.mocked(firestoreService);
const mockedLocationService = jest.mocked(locationService);

const buildLocationObject = (latitude: number, longitude: number, accuracy = 12): LocationObject => ({
  coords: {
    accuracy,
    altitude: null,
    altitudeAccuracy: null,
    heading: null,
    latitude,
    longitude,
    speed: null,
  },
  timestamp: Date.now(),
});

describe("useLocation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedAsyncStorage.getItem.mockResolvedValue(null);
    mockedAsyncStorage.setItem.mockResolvedValue();
    mockedApiService.getNearbyEvacuationCenters.mockResolvedValue([]);
    mockedFirestoreService.listenToLocations.mockReturnValue(jest.fn());
    mockedFirestoreService.upsertLocation.mockResolvedValue({} as never);
    mockedLocationService.getNearestCenter.mockReturnValue(null);
    mockedLocationService.distanceBetween.mockReturnValue(0);
  });

  it("does not restart hydration when the same location update arrives again", async () => {
    let watchHandler: ((location: LocationObject) => void) | null = null;

    mockedLocationService.requestPermission.mockResolvedValue({ status: "granted" } as never);
    mockedLocationService.watchPosition.mockImplementation(async (onUpdate) => {
      watchHandler = onUpdate;
      return { remove: jest.fn() };
    });
    mockedLocationService.getCurrentPosition.mockResolvedValue(buildLocationObject(10.2635, 123.8395) as never);

    function Probe() {
      const location = useLocation("user-1", "group-1", true, []);

      useEffect(() => {
        if (location.permissionStatus === "granted") {
          // Keep a stable render path without adding extra assertions to the component tree.
        }
      }, [location.permissionStatus]);

      return null;
    }

    render(<Probe />);

    await waitFor(() => {
      expect(mockedLocationService.requestPermission).toHaveBeenCalledTimes(1);
      expect(mockedLocationService.watchPosition).toHaveBeenCalledTimes(1);
      expect(mockedLocationService.getCurrentPosition).toHaveBeenCalledTimes(1);
      expect(mockedAsyncStorage.setItem).toHaveBeenCalledTimes(1);
    });

    await act(async () => {
      watchHandler?.(buildLocationObject(10.2635, 123.8395));
    });

    await waitFor(() => {
      expect(mockedLocationService.requestPermission).toHaveBeenCalledTimes(1);
      expect(mockedLocationService.watchPosition).toHaveBeenCalledTimes(1);
      expect(mockedLocationService.getCurrentPosition).toHaveBeenCalledTimes(1);
      expect(mockedAsyncStorage.setItem).toHaveBeenCalledTimes(1);
    });
  });

  it("waits for a signed-in user before requesting nearby evacuation centers", async () => {
    mockedLocationService.requestPermission.mockResolvedValue({ status: "granted" } as never);
    mockedLocationService.watchPosition.mockResolvedValue({ remove: jest.fn() } as never);
    mockedLocationService.getCurrentPosition.mockResolvedValue(buildLocationObject(10.2635, 123.8395) as never);

    function Probe({ userId }: { userId?: string }) {
      useLocation(userId, "group-1", true, []);
      return null;
    }

    const screen = render(<Probe />);

    await waitFor(() => {
      expect(mockedLocationService.getCurrentPosition).toHaveBeenCalledTimes(1);
    });

    expect(mockedApiService.getNearbyEvacuationCenters).not.toHaveBeenCalled();

    screen.rerender(<Probe userId="user-1" />);

    await waitFor(() => {
      expect(mockedApiService.getNearbyEvacuationCenters).toHaveBeenCalledWith({
        accuracy: 12,
        latitude: 10.2635,
        longitude: 123.8395,
      });
    });
  });
});
