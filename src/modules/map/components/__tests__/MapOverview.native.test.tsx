/** Purpose: Verify the native Home map delegates markers to Google Navigation SDK. */
import { Platform } from "react-native";
import { act, render, waitFor } from "@testing-library/react-native";

import { MapOverview } from "@/modules/map/components/MapOverview.native";
import type { DisasterAlert, EvacuationCenter, HomeMapMarker } from "@/types";

const mockAddCircle = jest.fn().mockResolvedValue(undefined);
const mockAddMarker = jest.fn().mockResolvedValue(undefined);
const mockClearMapView = jest.fn();
const mockGetCameraPosition = jest.fn().mockResolvedValue({ zoom: 16.75 });
const mockMoveCamera = jest.fn();

jest.mock("@googlemaps/react-native-navigation-sdk", () => {
  const React = require("react");
  const { View: MockView } = require("react-native");

  return {
    MapColorScheme: {
      DARK: "DARK",
      LIGHT: "LIGHT",
    },
    MapType: {
      NORMAL: "NORMAL",
    },
    MapView: ({ onMapReady, onMapViewControllerCreated, ...props }: any) => {
      React.useEffect(() => {
        onMapViewControllerCreated?.({
          addCircle: mockAddCircle,
          addMarker: mockAddMarker,
          clearMapView: mockClearMapView,
          getCameraPosition: mockGetCameraPosition,
          moveCamera: mockMoveCamera,
        });
        onMapReady?.();
      }, []);

      return <MockView testID="navigation-view" {...props} />;
    },
  };
});

jest.mock("@/modules/map/markerIconService", () => ({
  buildLocalMarkerIcon: jest.fn(
    async ({ markerId, mapTheme }: { mapTheme: string; markerId: string }) =>
      `/tmp/${markerId}-${mapTheme}.png`,
  ),
  hasNativeMarkerIconSupport: jest.fn(() => true),
}));

const currentUserMarker: HomeMapMarker = {
  displayName: "Karlos Galias",
  isCurrentUser: true,
  isPrimaryContact: false,
  latitude: 10.3,
  longitude: 123.9,
  markerId: "user-1",
  photoURL: "https://example.com/avatar.jpg",
  presenceStatus: "live",
  sharingState: "live",
  userId: "user-1",
};

const offlineMemberMarker: HomeMapMarker = {
  displayName: "Matheo Labandero",
  isCurrentUser: false,
  isPrimaryContact: false,
  lastSeenAt: "2026-05-25T03:45:00.000Z",
  lastSeenMinutes: 12,
  latitude: 10.31,
  longitude: 123.91,
  markerId: "user-2",
  photoURL: undefined,
  presenceStatus: "offline",
  sharingState: "live",
  userId: "user-2",
};

const center: EvacuationCenter = {
  address: "Talisay City, Cebu",
  capacity: 300,
  centerId: "center-1",
  contact: "+639171234567",
  latitude: 10.261,
  longitude: 123.849,
  name: "Talisay Evacuation Center",
  region: "Central Visayas",
};

const alert: DisasterAlert = {
  alertId: "alert-1",
  createdAt: new Date("2026-05-05T00:00:00.000Z").toISOString(),
  groupId: "group-1",
  latitude: 10.26,
  longitude: 123.84,
  message: "Flood alert",
  severity: "warning",
  source: "manual",
  title: "Flood warning",
  type: "flood",
};

describe("MapOverview native Navigation SDK map", () => {
  beforeAll(() => {
    Object.defineProperty(Platform, "OS", {
      configurable: true,
      get: () => "android",
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCameraPosition.mockResolvedValue({ zoom: 16.75 });
  });

  it("adds evacuation centers and home markers without rendering alert radius circles", async () => {
    render(
      <MapOverview
        alerts={[alert]}
        centers={[center]}
        mapTheme="light"
        markers={[currentUserMarker]}
      />,
    );

    await waitFor(() => {
      expect(mockClearMapView).toHaveBeenCalled();
      expect(mockAddMarker).toHaveBeenCalledWith(
        expect.objectContaining({ id: "center:center-1", imgPath: "/tmp/center-1-light.png" }),
      );
      expect(mockAddMarker).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "member:user-1",
          imgPath: "/tmp/user-1-light.png",
          title: "Karlos Galias",
        }),
      );
    });

    expect(mockAddCircle).not.toHaveBeenCalled();
  });

  it("uses a clean single-line title bubble for member markers", async () => {
    render(
      <MapOverview
        alerts={[]}
        centers={[center]}
        mapTheme="light"
        markers={[offlineMemberMarker]}
      />,
    );

    await waitFor(() => {
      expect(mockAddMarker).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "member:user-2",
          title: "Matheo Labandero",
        }),
      );
    });

    const memberCall = mockAddMarker.mock.calls.find(([options]) => options.id === "member:user-2");
    expect(memberCall?.[0]).not.toHaveProperty("snippet");
    expect(memberCall?.[0].title).not.toContain("last seen");
    expect(memberCall?.[0].title).not.toContain("12m");
  });

  it("passes the SOSync custom map style to the Navigation SDK map", async () => {
    const screen = render(
      <MapOverview
        alerts={[]}
        centers={[]}
        mapTheme="light"
        markers={[currentUserMarker]}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("navigation-view").props.mapStyle).toContain("#F8F2EC");
      expect(mockAddMarker).toHaveBeenCalledWith(expect.objectContaining({ id: "member:user-1" }));
    });
  });

  it("routes marker taps through the existing Home callbacks", async () => {
    const onCenterPress = jest.fn();
    const onCenterRoutePress = jest.fn();
    const onMarkerPress = jest.fn();
    const screen = render(
      <MapOverview
        alerts={[]}
        centers={[center]}
        mapTheme="light"
        markers={[currentUserMarker]}
        onCenterPress={onCenterPress}
        onCenterRoutePress={onCenterRoutePress}
        onMarkerPress={onMarkerPress}
      />,
    );

    const navigationView = screen.getByTestId("navigation-view");

    await act(async () => {
      navigationView.props.onMarkerClick({ id: "center:center-1" });
      navigationView.props.onMarkerClick({ id: "member:user-1" });
      navigationView.props.onMarkerInfoWindowTapped({ id: "center:center-1" });
    });

    expect(onCenterPress).toHaveBeenCalledWith("center-1");
    expect(onMarkerPress).toHaveBeenCalledWith("user-1");
    expect(onCenterRoutePress).toHaveBeenCalledWith("center-1");
  });

  it("does not open route preview when the center marker itself is tapped", async () => {
    const onCenterPress = jest.fn();
    const onCenterRoutePress = jest.fn();
    const screen = render(
      <MapOverview
        alerts={[]}
        centers={[center]}
        mapTheme="light"
        markers={[currentUserMarker]}
        onCenterPress={onCenterPress}
        onCenterRoutePress={onCenterRoutePress}
      />,
    );

    const navigationView = screen.getByTestId("navigation-view");

    await act(async () => {
      navigationView.props.onMarkerClick({ id: "center:center-1" });
    });

    expect(onCenterPress).toHaveBeenCalledWith("center-1");
    expect(onCenterRoutePress).not.toHaveBeenCalled();
  });

  it("opens route preview when the center native nametag is tapped", async () => {
    const onCenterRoutePress = jest.fn();
    const screen = render(
      <MapOverview
        alerts={[]}
        centers={[center]}
        mapTheme="light"
        markers={[currentUserMarker]}
        onCenterRoutePress={onCenterRoutePress}
      />,
    );

    const navigationView = screen.getByTestId("navigation-view");

    await act(async () => {
      navigationView.props.onMarkerInfoWindowTapped({ id: "center:center-1" });
    });

    expect(onCenterRoutePress).toHaveBeenCalledWith("center-1");
  });

  it("starts the Home map with a closer default zoom", async () => {
    const screen = render(
      <MapOverview
        alerts={[]}
        centers={[center]}
        mapTheme="dark"
        markers={[currentUserMarker]}
      />,
    );

    expect(screen.getByTestId("navigation-view").props.initialCameraPosition).toEqual(
      expect.objectContaining({
        target: { lat: 10.3, lng: 123.9 },
        zoom: 15.5,
      }),
    );

    await waitFor(() => {
      expect(mockMoveCamera).toHaveBeenCalledWith(
        expect.objectContaining({
          target: { lat: 10.3, lng: 123.9 },
          zoom: 15.5,
        }),
      );
    });
  });

  it("moves the Navigation SDK camera using the current map zoom when Home issues a focus target", async () => {
    render(
      <MapOverview
        alerts={[]}
        centers={[center]}
        focusTarget={{ kind: "center", centerId: "center-1", token: 1 }}
        mapTheme="dark"
        markers={[currentUserMarker]}
      />,
    );

    await waitFor(() => {
      expect(mockGetCameraPosition).toHaveBeenCalled();
      expect(mockMoveCamera).toHaveBeenCalledWith(
        expect.objectContaining({
          target: { lat: 10.261, lng: 123.849 },
          zoom: 16.75,
        }),
      );
    });
  });

  it("uses the closer default zoom for focus if current camera lookup is unavailable", async () => {
    mockGetCameraPosition.mockRejectedValueOnce(new Error("camera unavailable"));

    render(
      <MapOverview
        alerts={[]}
        centers={[center]}
        focusTarget={{ kind: "center", centerId: "center-1", token: 1 }}
        mapTheme="dark"
        markers={[currentUserMarker]}
      />,
    );

    await waitFor(() => {
      expect(mockMoveCamera).toHaveBeenCalledWith(
        expect.objectContaining({
          target: { lat: 10.261, lng: 123.849 },
          zoom: 15.5,
        }),
      );
    });
  });
});
