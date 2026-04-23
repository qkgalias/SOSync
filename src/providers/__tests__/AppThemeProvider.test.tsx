import { act, render, screen } from "@testing-library/react-native";
import { Appearance, AppState, Text } from "react-native";
import type { AppStateStatus, ColorSchemeName } from "react-native";

import { AppThemeProvider, useAppTheme } from "@/providers/AppThemeProvider";
import type { ThemePreference } from "@/types";

let mockThemePreference: ThemePreference = "system";
const mockSetBackgroundColorAsync = jest.fn(async (_color: string) => undefined);

jest.mock("@/hooks/useAuthSession", () => ({
  useAuthSession: () => ({
    profile: {
      preferences: {
        theme: mockThemePreference,
      },
    },
    status: "signedIn",
  }),
}));

jest.mock("expo-status-bar", () => ({
  StatusBar: () => null,
}));

jest.mock("expo-system-ui", () => ({
  setBackgroundColorAsync: (color: string) => mockSetBackgroundColorAsync(color),
}));

jest.mock("nativewind", () => ({
  vars: (tokens: unknown) => tokens,
}));

const ThemeProbe = () => {
  const { resolvedTheme } = useAppTheme();

  return <Text testID="resolved-theme">{resolvedTheme}</Text>;
};

const renderThemeProvider = () =>
  render(
    <AppThemeProvider>
      <ThemeProbe />
    </AppThemeProvider>,
  );

describe("AppThemeProvider system theme", () => {
  let appearanceListener: ((state: { colorScheme: ColorSchemeName }) => void) | undefined;
  let appStateListener: ((state: AppStateStatus) => void) | undefined;

  beforeEach(() => {
    mockThemePreference = "system";
    mockSetBackgroundColorAsync.mockClear();
    appearanceListener = undefined;
    appStateListener = undefined;

    jest.spyOn(Appearance, "getColorScheme").mockReturnValue("dark");
    jest.spyOn(Appearance, "addChangeListener").mockImplementation((listener) => {
      appearanceListener = listener;
      return { remove: jest.fn() };
    });
    jest.spyOn(AppState, "addEventListener").mockImplementation((_event, listener) => {
      appStateListener = listener;
      return { remove: jest.fn() };
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("initializes system preference from device dark mode", () => {
    renderThemeProvider();

    expect(screen.getByTestId("resolved-theme")).toHaveTextContent("dark");
  });

  it("updates system preference from Appearance events", () => {
    renderThemeProvider();

    act(() => {
      appearanceListener?.({ colorScheme: "light" });
    });

    expect(screen.getByTestId("resolved-theme")).toHaveTextContent("light");
  });

  it("refreshes system preference when the app returns active", () => {
    renderThemeProvider();

    jest.spyOn(Appearance, "getColorScheme").mockReturnValue("light");

    act(() => {
      appStateListener?.("active");
    });

    expect(screen.getByTestId("resolved-theme")).toHaveTextContent("light");
  });

  it("keeps the last valid system preference when Android reports no scheme", () => {
    renderThemeProvider();

    act(() => {
      appearanceListener?.({ colorScheme: null as unknown as ColorSchemeName });
    });

    expect(screen.getByTestId("resolved-theme")).toHaveTextContent("dark");
  });

  it("keeps explicit theme preferences above the system preference", () => {
    mockThemePreference = "light";

    renderThemeProvider();

    expect(screen.getByTestId("resolved-theme")).toHaveTextContent("light");
  });
});
