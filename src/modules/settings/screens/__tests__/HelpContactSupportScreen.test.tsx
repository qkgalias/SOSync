/** Purpose: Verify support requests fall back cleanly without exposing raw backend wording. */
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";
import { Linking } from "react-native";

import HelpContactSupportScreen from "@/modules/settings/screens/HelpContactSupportScreen";
import { supportService } from "@/services/supportService";

const mockOpenURL = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
  }),
}));

jest.mock("expo-device", () => ({
  modelName: "Pixel 9",
}));

jest.mock("@/components/Screen", () => ({
  Screen: ({ children, title }: { children: ReactNode; title?: string }) => {
    const { Text, View } = jest.requireActual("react-native");
    return (
      <View>
        {title ? <Text>{title}</Text> : null}
        {children}
      </View>
    );
  },
}));

jest.mock("@/components/Button", () => ({
  Button: ({ label, onPress }: { label: string; onPress: () => void }) => {
    const { Pressable, Text } = jest.requireActual("react-native");
    return (
      <Pressable onPress={onPress}>
        <Text>{label}</Text>
      </Pressable>
    );
  },
}));

jest.mock("@/components/BackButton", () => ({
  BackButton: () => null,
}));

jest.mock("@/providers/AppThemeProvider", () => ({
  useAppTheme: () => ({
    themeTokens: {
      accentPrimary: "#7C2C2C",
      textMuted: "#666666",
    },
  }),
}));

jest.mock("@/services/supportService", () => ({
  supportService: {
    submitSupportRequest: jest.fn(),
  },
}));

const mockedSupportService = jest.mocked(supportService);
const openURLSpy = jest.spyOn(Linking, "openURL");

describe("HelpContactSupportScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    openURLSpy.mockResolvedValue(undefined as never);
    openURLSpy.mockImplementation(mockOpenURL);
  });

  it("shows friendly fallback copy when backend submission fails", async () => {
    mockedSupportService.submitSupportRequest.mockRejectedValueOnce(new Error("Firestore did not respond in time."));

    render(<HelpContactSupportScreen />);

    fireEvent.changeText(screen.getByPlaceholderText("Write your message or question here..."), "Need help");
    fireEvent.press(screen.getByText("Send Support Request"));

    await waitFor(() => {
      expect(mockOpenURL).toHaveBeenCalled();
    });

    expect(screen.getByText("We couldn't send your support request in the app, so we opened an email draft instead.")).toBeTruthy();
    expect(screen.queryByText(/Firestore|Firebase|INTERNAL/i)).toBeNull();
  });

  it("shows a success modal with the returned support reference", async () => {
    mockedSupportService.submitSupportRequest.mockResolvedValueOnce({ requestId: "support-123456" });

    render(<HelpContactSupportScreen />);

    fireEvent.changeText(screen.getByPlaceholderText("Write your message or question here..."), "Need help");
    fireEvent.press(screen.getByText("Send Support Request"));

    await waitFor(() => {
      expect(screen.getByText("Support request sent")).toBeTruthy();
    });

    expect(screen.getByText("support-123456")).toBeTruthy();
    expect(screen.queryByText(/Support request received\. Reference/i)).toBeNull();

    fireEvent.press(screen.getByText("OK"));
    expect(screen.queryByText("Support request sent")).toBeNull();
  });
});
