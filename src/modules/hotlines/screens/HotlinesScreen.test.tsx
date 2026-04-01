/** Purpose: Smoke test the hotlines screen with seeded regional data. */
import { fireEvent, render, screen } from "@testing-library/react-native";
import { Alert, Linking } from "react-native";

import HotlinesScreen from "@/modules/hotlines/screens/HotlinesScreen";

jest.mock("@expo/vector-icons", () => ({
  MaterialCommunityIcons: ({ name }: { name: string }) => {
    const { Text } = require("react-native");
    return <Text>{name}</Text>;
  },
}));

jest.mock("@/hooks/useHotlines", () => ({
  useHotlines: () => [
    {
      hotlineId: "911",
      name: "National Emergency Hotline",
      phone: "911",
      region: "PH",
      description: "National emergency coordination",
    },
    {
      hotlineId: "ndrrmc",
      name: "NDRRMC Operations Center",
      phone: "(02) 8911 5061",
      region: "PH",
      description: "National disaster coordination",
    },
  ],
}));

describe("HotlinesScreen", () => {
  beforeEach(() => {
    jest.spyOn(Alert, "alert").mockImplementation(jest.fn());
    jest.spyOn(Linking, "openURL").mockResolvedValue(true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("renders the seeded emergency hotlines without preferred actions", () => {
    render(<HotlinesScreen />);

    expect(screen.getByText("Emergency Hotlines")).toBeTruthy();
    expect(screen.getByText("Call for help when you need immediate assistance.")).toBeTruthy();
    expect(screen.getByText("National Emergency Hotline")).toBeTruthy();
    expect(screen.getByText("911")).toBeTruthy();
    expect(screen.getByText("NDRRMC Operations Center")).toBeTruthy();
    expect(screen.queryByText("Call now")).toBeNull();
    expect(screen.queryByText("Set preferred")).toBeNull();
  });

  it("opens a confirmation dialog and dials the hotline only after confirmation", () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(jest.fn());
    const openUrlSpy = jest.spyOn(Linking, "openURL").mockResolvedValue(true);

    render(<HotlinesScreen />);

    fireEvent.press(screen.getByText("National Emergency Hotline"));

    expect(alertSpy).toHaveBeenCalledWith(
      "National Emergency Hotline",
      "911\n\nCall this hotline now?",
      expect.arrayContaining([
        expect.objectContaining({ text: "Cancel", style: "cancel" }),
        expect.objectContaining({ text: "Call" }),
      ]),
    );

    const buttons = alertSpy.mock.calls[0]?.[2];
    const callButton = Array.isArray(buttons) ? buttons.find((button) => button.text === "Call") : undefined;
    callButton?.onPress?.();

    expect(openUrlSpy).toHaveBeenCalledWith("tel:911");
  });
});
