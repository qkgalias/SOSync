/** Purpose: Verify disaster alert details stay useful, minimal, and navigable. */
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import type { ReactNode } from "react";

import AlertDetailScreen from "@/modules/alerts/screens/AlertDetailScreen";
import type { DisasterAlert } from "@/types";

const mockBack = jest.fn();
const mockReplace = jest.fn();
const mockReverseGeocodeDetails = jest.fn();
let mockAlertId = "alert-1";
let mockAlerts: DisasterAlert[] = [];

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ alertId: mockAlertId }),
  useRouter: () => ({
    back: mockBack,
    canGoBack: () => false,
    replace: mockReplace,
  }),
}));

jest.mock("@expo/vector-icons", () => ({
  MaterialCommunityIcons: ({ name }: { name: string }) => {
    const { Text } = jest.requireActual("react-native");
    return <Text>{name}</Text>;
  },
}));

jest.mock("@/components/Screen", () => ({
  Screen: ({
    children,
    leftSlot,
    subtitle,
    title,
  }: {
    children: ReactNode;
    leftSlot?: ReactNode;
    subtitle?: string;
    title?: string;
  }) => {
    const { Text, View } = jest.requireActual("react-native");
    return (
      <View>
        {leftSlot}
        {title ? <Text>{title}</Text> : null}
        {subtitle ? <Text>{subtitle}</Text> : null}
        {children}
      </View>
    );
  },
}));

jest.mock("@/providers/AppThemeProvider", () => ({
  useAppTheme: () => ({
    themeTokens: {
      textPrimary: "#2E2C2C",
    },
  }),
}));

jest.mock("@/hooks/useAuthSession", () => ({
  useAuthSession: () => ({
    selectedGroupId: "group-1",
  }),
}));

jest.mock("@/hooks/useAlerts", () => ({
  useAlerts: () => mockAlerts,
}));

jest.mock("@/services/locationService", () => ({
  locationService: {
    reverseGeocodeDetails: (...args: unknown[]) =>
      mockReverseGeocodeDetails(...args),
  },
}));

const buildAlert = (overrides: Partial<DisasterAlert> = {}): DisasterAlert => ({
  alertId: "alert-1",
  areaLabel: "Near shared circle locations",
  createdAt: "2026-05-24T08:00:00.000Z",
  forecastEnd: "2026-05-25T07:00:00.000Z",
  forecastStart: "2026-05-24T08:00:00.000Z",
  forecastWindow: "2026-05-24T08:00 to 2026-05-25T07:00",
  groupId: "group-1",
  lastEvaluatedAt: "2026-05-24T08:30:00.000Z",
  latitude: 10.2576,
  locationConfidence: "higher",
  longitude: 123.8512,
  message: "Rain and storm conditions may strengthen near your circle.",
  peakRainfallMm: 14.2,
  peakRiskEnd: "2026-05-24T09:00:00.000Z",
  peakRiskStart: "2026-05-24T08:00:00.000Z",
  rainChancePercent: 75,
  recommendedActions: [
    "Keep notifications on.",
    "Confirm important contacts are reachable.",
  ],
  severity: "watch",
  source: "open-meteo",
  temperatureC: 27,
  title: "Storm watch near your circle",
  type: "storm",
  uvIndex: 2,
  windGustKph: 40,
  windSpeedKph: 25,
  ...overrides,
});

describe("AlertDetailScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAlertId = "alert-1";
    mockAlerts = [buildAlert()];
    mockReverseGeocodeDetails.mockResolvedValue({
      addressLabel: "Rafael Rabaya Rd, Talisay",
      localityLabel: "Talisay",
    });
  });

  it("renders an engaging alert detail with readable dates, forecast, and location", async () => {
    render(<AlertDetailScreen />);

    await waitFor(() => {
      expect(screen.getByText(/Rafael Rabaya Rd, Talisay/)).toBeTruthy();
    });

    expect(screen.getByTestId("alert-detail-back")).toBeTruthy();
    expect(screen.getByText("Storm watch near your circle")).toBeTruthy();
    expect(screen.getByText("Issued: 4:00 PM")).toBeTruthy();
    expect(screen.getByText("STORM ADVISORY")).toBeTruthy();
    expect(screen.getByText("Today's Forecast")).toBeTruthy();
    expect(screen.getByText("Expected Timing")).toBeTruthy();
    expect(screen.getByText("Recommended Action")).toBeTruthy();
    expect(screen.getByText("Safety Tips")).toBeTruthy();
    expect(screen.getByText("Keep notifications on.")).toBeTruthy();
    expect(
      screen.getByText("05/24/26, 4:00 PM - 05/25/26, 3:00 PM"),
    ).toBeTruthy();
    expect(screen.getByText("Rain chance")).toBeTruthy();
    expect(screen.getByText("75%")).toBeTruthy();
    expect(screen.getByText("Wind")).toBeTruthy();
    expect(screen.getByText("25-40 km/h")).toBeTruthy();
    expect(screen.getByText("Temperature")).toBeTruthy();
    expect(screen.getByText("27°C")).toBeTruthy();
    expect(screen.getByText("UV Index")).toBeTruthy();
    expect(screen.getByText("Low")).toBeTruthy();
    expect(screen.getByText("Peak rainfall")).toBeTruthy();
    expect(screen.getByText("14.2 mm")).toBeTruthy();
    expect(screen.getByText("Expected peak")).toBeTruthy();
    expect(screen.getAllByText("4:00 PM - 5:00 PM").length).toBeGreaterThan(0);
    expect(screen.getByText(/Updated:/)).toBeTruthy();
    expect(screen.getByText("Source: open-meteo")).toBeTruthy();
    expect(screen.getByText("Radius: 5 km around your circle")).toBeTruthy();
    expect(screen.getAllByTestId("alert-hero-footer")).toHaveLength(1);
    expect(
      screen.getByText(
        "Conditions can change quickly. We'll keep you updated.",
      ),
    ).toBeTruthy();

    expect(screen.queryByText(/10\.2576|123\.8512/)).toBeNull();
    expect(screen.queryByText("Not available")).toBeNull();
    expect(
      screen.queryByText(
        "Detailed forecast metrics will appear after the advisory refreshes.",
      ),
    ).toBeNull();
  });

  it("renders a refresh note when old alert data only has storm risk", async () => {
    mockAlerts = [
      buildAlert({
        peakRainfallMm: undefined,
        peakRiskEnd: undefined,
        peakRiskStart: undefined,
        rainChancePercent: undefined,
        temperatureC: undefined,
        uvIndex: undefined,
        windGustKph: undefined,
        windSpeedKph: undefined,
      }),
    ];

    render(<AlertDetailScreen />);

    await waitFor(() => {
      expect(screen.getByText(/Rafael Rabaya Rd, Talisay/)).toBeTruthy();
    });

    expect(screen.queryByText("Rain chance")).toBeNull();
    expect(screen.queryByText("Wind")).toBeNull();
    expect(screen.queryByText("Temperature")).toBeNull();
    expect(screen.queryByText("UV Index")).toBeNull();
    expect(screen.queryByText("Not available")).toBeNull();
    expect(screen.getByText("Storm risk")).toBeTruthy();
    expect(screen.getByText("Moderate")).toBeTruthy();
    expect(
      screen.getByText(
        "Detailed forecast metrics will appear after the advisory refreshes.",
      ),
    ).toBeTruthy();
  });

  it("falls back to the alert area label when reverse geocoding fails", async () => {
    mockReverseGeocodeDetails.mockRejectedValueOnce(
      new Error("geocode failed"),
    );

    render(<AlertDetailScreen />);

    await waitFor(() => {
      expect(mockReverseGeocodeDetails).toHaveBeenCalled();
    });

    expect(screen.getByText(/Near shared circle locations/)).toBeTruthy();
    expect(screen.queryByText(/10\.2576|123\.8512/)).toBeNull();
  });

  it("returns to the Alerts tab when the alert cannot be found", () => {
    mockAlerts = [];

    render(<AlertDetailScreen />);

    expect(screen.getByText("Alert unavailable")).toBeTruthy();
    fireEvent.press(screen.getByText("Back to Alerts"));

    expect(mockReplace).toHaveBeenCalledWith("/(tabs)/notifications");
  });
});
