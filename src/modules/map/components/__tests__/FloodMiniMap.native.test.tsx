/** Purpose: Verify the flood area preview uses the Navigation SDK map without react-native-maps. */
import { act, render, waitFor } from "@testing-library/react-native";

import { FloodMiniMap } from "@/modules/map/components/FloodMiniMap.native";
import type { FloodOverview } from "@/types";

const mockAddMarker = jest.fn().mockResolvedValue(undefined);
const mockAddPolygon = jest.fn().mockResolvedValue(undefined);
const mockAddPolyline = jest.fn().mockResolvedValue(undefined);
const mockClearMapView = jest.fn();
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
          addMarker: mockAddMarker,
          addPolygon: mockAddPolygon,
          addPolyline: mockAddPolyline,
          clearMapView: mockClearMapView,
          moveCamera: mockMoveCamera,
        });
        onMapReady?.();
      }, []);

      return <MockView testID="navigation-sdk-flood-preview" {...props} />;
    },
  };
});

const floodMap: NonNullable<FloodOverview["map"]> = {
  gauges: [
    {
      gaugeId: "primary-gauge",
      isPrimary: true,
      label: "Monitoring point near Talisay",
      latitude: 10.2447,
      level: "SAFE",
      longitude: 123.8494,
    },
    {
      gaugeId: "supporting-gauge",
      isPrimary: false,
      label: "Nearby monitoring point",
      latitude: 10.2847,
      level: "CAUTION",
      longitude: 123.8194,
    },
  ],
  hasRenderableData: true,
  polygons: [
    {
      kind: "inundation",
      level: "CAUTION",
      points: [
        { latitude: 10.25, longitude: 123.84 },
        { latitude: 10.26, longitude: 123.84 },
        { latitude: 10.26, longitude: 123.86 },
      ],
      polygonId: "polygon-1",
    },
  ],
  userLocation: {
    latitude: 10.2635,
    longitude: 123.8395,
  },
};

describe("FloodMiniMap native", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("renders a read-only Navigation SDK map for the flood preview", async () => {
    const screen = render(<FloodMiniMap level="SAFE" map={floodMap} mapTheme="light" />);

    expect(screen.getByTestId("flood-mini-map")).toBeTruthy();
    expect(screen.getByTestId("navigation-sdk-flood-preview")).toHaveProp("scrollGesturesEnabled", false);
    expect(screen.getByTestId("navigation-sdk-flood-preview")).toHaveProp("zoomGesturesEnabled", false);
    expect(screen.getByTestId("navigation-sdk-flood-preview")).toHaveProp("mapColorScheme", "LIGHT");
    expect(screen.getByTestId("navigation-sdk-flood-preview").props.mapStyle).toBeUndefined();

    await act(async () => {
      jest.advanceTimersByTime(80);
    });

    expect(screen.getByTestId("navigation-sdk-flood-preview").props.mapStyle).toContain("#F8F2EC");
    expect(screen.queryByText("You")).toBeNull();
    expect(screen.queryByText("Monitoring point")).toBeNull();
  });

  it("adds user, monitoring point, connector, and polygon overlays", async () => {
    render(<FloodMiniMap level="CAUTION" map={floodMap} mapTheme="light" />);

    await act(async () => {
      jest.advanceTimersByTime(120);
    });

    await waitFor(() => {
      expect(mockClearMapView).toHaveBeenCalled();
      expect(mockAddMarker).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "flood-preview:user",
          title: "You",
        }),
      );
      expect(mockAddMarker).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "flood-preview:gauge:primary-gauge",
          title: "Closest monitoring point",
        }),
      );
      expect(mockAddPolyline).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "flood-preview:closest-line",
        }),
      );
      expect(mockAddPolygon).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "flood-preview:polygon:polygon-1",
        }),
      );
      expect(mockMoveCamera).toHaveBeenCalled();
    });
  });

  it("does not render when no preview data is available", () => {
    const screen = render(<FloodMiniMap level="SAFE" map={null} mapTheme="light" />);

    expect(screen.queryByTestId("flood-mini-map")).toBeNull();
  });

  it("matches the Home dark map style when Home is in dark mode", async () => {
    const screen = render(<FloodMiniMap level="SAFE" map={floodMap} mapTheme="dark" />);

    expect(screen.getByTestId("navigation-sdk-flood-preview")).toHaveProp("mapColorScheme", "DARK");
    expect(screen.getByTestId("navigation-sdk-flood-preview").props.mapStyle).toBeUndefined();

    await act(async () => {
      jest.advanceTimersByTime(80);
    });

    expect(screen.getByTestId("navigation-sdk-flood-preview").props.mapStyle).toContain("#26343E");
  });
});
