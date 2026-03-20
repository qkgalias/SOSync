/** Purpose: Smoke test the hotlines screen with seeded regional data. */
import { render, screen } from "@testing-library/react-native";

import HotlinesScreen from "@/modules/hotlines/screens/HotlinesScreen";

jest.mock("@/hooks/useHotlines", () => ({
  useHotlines: () => [
    {
      hotlineId: "911",
      name: "National Emergency Hotline",
      phone: "911",
      region: "PH",
    },
  ],
}));

describe("HotlinesScreen", () => {
  it("renders the seeded emergency hotline", () => {
    render(<HotlinesScreen />);

    expect(screen.getByText("National Emergency Hotline")).toBeTruthy();
    expect(screen.getByText("911")).toBeTruthy();
  });
});
