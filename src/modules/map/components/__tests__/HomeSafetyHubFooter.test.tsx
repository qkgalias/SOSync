/** Purpose: Verify the nearby safety hub list renders and opens navigation from the arrow control. */
import { fireEvent, render } from "@testing-library/react-native";

import { HomeSafetyHubFooter } from "@/modules/map/components/HomeSafetyHubFooter";
import { getHomeMapPalette } from "@/modules/map/homeMapTheme";

jest.mock("@expo/vector-icons", () => {
  const React = require("react");
  const { Text: MockText } = require("react-native");

  return {
    MaterialCommunityIcons: ({ name }: { name: string }) =>
      React.createElement(MockText, { accessibilityRole: "image" }, name),
  };
});

jest.mock("@gorhom/bottom-sheet", () => {
  const React = require("react");
  const { Pressable: MockPressable } = require("react-native");

  return {
    TouchableOpacity: ({ children, ...props }: Record<string, unknown>) =>
      React.createElement(MockPressable, props, children),
  };
});

describe("HomeSafetyHubFooter", () => {
  it("renders nearby hubs and opens navigation from the direction arrow", () => {
    const onStartNavigation = jest.fn();

    const screen = render(
      <HomeSafetyHubFooter
        appearance="light"
        nearbySafetyHubs={[
          {
            address: "Near Barangay Hall",
            capacity: 150,
            centerId: "near-1",
            contact: "123",
            distanceMeters: 850,
            latitude: 10.31,
            longitude: 123.91,
            name: "Near Hub",
            region: "PH",
          },
          {
            address: "Far School",
            capacity: 260,
            centerId: "far-1",
            contact: "456",
            distanceMeters: 1_750,
            latitude: 10.4,
            longitude: 123.98,
            name: "Far Hub",
            region: "PH",
          },
        ]}
        onStartNavigation={onStartNavigation}
        palette={getHomeMapPalette("light")}
        selectedCenterId={null}
      />,
    );

    expect(screen.getByText("Nearby Safety Hubs")).toBeTruthy();
    expect(screen.getByText("Near Hub")).toBeTruthy();
    expect(screen.getByText("Far Hub")).toBeTruthy();
    expect(screen.queryByText("Near Barangay Hall")).toBeNull();
    expect(screen.queryByText("Far School")).toBeNull();

    const arrowButtons = screen.getAllByRole("button");
    fireEvent.press(arrowButtons[0]);

    expect(onStartNavigation).toHaveBeenCalledWith("near-1");
  });

  it("renders the no nearby hubs card when the visible hub list is empty", () => {
    const screen = render(
      <HomeSafetyHubFooter
        appearance="light"
        nearbySafetyHubs={[]}
        onStartNavigation={jest.fn()}
        palette={getHomeMapPalette("light")}
        selectedCenterId={null}
      />,
    );

    expect(screen.getByText("Nearby Safety Hubs")).toBeTruthy();
    expect(screen.getByText("No nearby safety hubs available")).toBeTruthy();
    expect(screen.getByText("No nearby safety hubs found within 2 km of your location.")).toBeTruthy();
  });
});
