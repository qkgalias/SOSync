/** Purpose: Verify native Home map avatar markers render photos without waiting for prefetch bookkeeping. */
import { Image, Platform } from "react-native";
import { render } from "@testing-library/react-native";

import { MapOverview } from "@/modules/map/components/MapOverview.native";
import type { HomeMapMarker } from "@/types";

jest.mock("@expo/vector-icons", () => {
  const { Text } = require("react-native");

  return {
    MaterialCommunityIcons: ({ name }: { name: string }) => <Text>{name}</Text>,
  };
});

jest.mock("react-native-maps", () => {
  const React = require("react");
  const { View } = require("react-native");

  const MockMapView = React.forwardRef(({ children, ...props }: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({
      animateToRegion: jest.fn(),
      pointForCoordinate: jest.fn().mockResolvedValue({ x: 0, y: 0 }),
      takeSnapshot: jest.fn().mockResolvedValue("file://home-map-snapshot.png"),
    }));

    return (
      <View testID="map-view" {...props}>
        {children}
      </View>
    );
  });

  const MockMarker = ({ children, identifier, tracksViewChanges }: any) => (
    <View testID={`marker-${identifier}`} tracksViewChanges={tracksViewChanges}>
      {children}
    </View>
  );

  return {
    __esModule: true,
    Circle: (props: any) => <View testID="map-circle" {...props} />,
    Marker: MockMarker,
    PROVIDER_GOOGLE: "google",
    default: MockMapView,
  };
});

const currentUserMarker: HomeMapMarker = {
  displayName: "Karlos Galias",
  isCurrentUser: true,
  isPrimaryContact: false,
  latitude: 10.3,
  longitude: 123.9,
  markerId: "user-1",
  photoURL: "https://example.com/avatar.jpg",
  sharingState: "live",
  userId: "user-1",
};

const renderMapOverview = (prefetchedMarkerPhotos: Record<string, true> = {}) =>
  render(
    <MapOverview
      alerts={[]}
      centers={[]}
      mapTheme="light"
      markers={[currentUserMarker]}
      prefetchedMarkerPhotos={prefetchedMarkerPhotos}
    />,
  );

describe("MapOverview native avatar markers", () => {
  beforeAll(() => {
    Object.defineProperty(Platform, "OS", {
      configurable: true,
      get: () => "android",
    });
  });

  it("renders the avatar image immediately even before prefetch marks it ready", () => {
    const screen = renderMapOverview();

    const avatarImage = screen.UNSAFE_getByType(Image);
    expect(avatarImage.props.source).toEqual({ uri: "https://example.com/avatar.jpg" });
    expect(screen.queryByText("KG")).toBeTruthy();
  });

  it("keeps the marker instance stable when prefetch readiness changes", () => {
    const screen = renderMapOverview();
    const markerBefore = screen.getByTestId("marker-user-1");

    screen.rerender(
      <MapOverview
        alerts={[]}
        centers={[]}
        mapTheme="light"
        markers={[currentUserMarker]}
        prefetchedMarkerPhotos={{ "https://example.com/avatar.jpg": true }}
      />,
    );

    expect(screen.getByTestId("marker-user-1")).toBe(markerBefore);
    expect(screen.UNSAFE_getByType(Image).props.source).toEqual({
      uri: "https://example.com/avatar.jpg",
    });
  });
});
