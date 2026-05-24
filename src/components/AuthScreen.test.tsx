/** Purpose: Guard the onboarding auth shell against fixed keyboard layouts on phones. */
import { render, screen } from "@testing-library/react-native";
import { Text } from "react-native";

import { AuthScreen } from "@/components/AuthScreen";

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({
    bottom: 24,
    left: 0,
    right: 0,
    top: 0,
  }),
}));

jest.mock("@/providers/AppThemeProvider", () => ({
  useAppTheme: () => {
    const { LIGHT_THEME_TOKENS } = jest.requireActual("@/theme/appTheme");

    return {
      resolvedTheme: "light",
      themePreference: "light",
      themeTokens: LIGHT_THEME_TOKENS,
    };
  },
}));

describe("AuthScreen", () => {
  it("keeps fixed auth layouts keyboard-aware and scrollable", () => {
    render(
      <AuthScreen
        scrollable={false}
        hero={<Text>Create an Account</Text>}
      >
        <Text>Confirm Password</Text>
        <Text>Continue</Text>
      </AuthScreen>,
    );

    expect(screen.getByTestId("auth-screen-keyboard-avoiding-view")).toBeTruthy();
    expect(screen.getByTestId("auth-screen-scroll-view")).toBeTruthy();
    expect(screen.getByTestId("auth-screen-scroll-view")).toHaveProp("keyboardShouldPersistTaps", "handled");
    expect(screen.getByText("Confirm Password")).toBeTruthy();
    expect(screen.getByText("Continue")).toBeTruthy();
  });

  it("keeps standard auth layouts scrollable too", () => {
    render(
      <AuthScreen>
        <Text>Scrollable auth content</Text>
      </AuthScreen>,
    );

    expect(screen.getByTestId("auth-screen-keyboard-avoiding-view")).toBeTruthy();
    expect(screen.getByTestId("auth-screen-scroll-view")).toBeTruthy();
    expect(screen.getByText("Scrollable auth content")).toBeTruthy();
  });
});
