/** Purpose: Verify problem reports fail safely and show a success confirmation modal. */
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";
import { Linking } from "react-native";

import HelpReportProblemScreen from "@/modules/settings/screens/HelpReportProblemScreen";
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

jest.mock("expo-image-picker", () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(async () => ({ granted: true })),
  launchImageLibraryAsync: jest.fn(async () => ({ canceled: true, assets: [] })),
}));

jest.mock("@expo/vector-icons", () => ({
  MaterialCommunityIcons: () => null,
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
      textPrimary: "#2E2C2C",
      dangerText: "#A62C2C",
    },
  }),
}));

jest.mock("@/hooks/useAuthSession", () => ({
  useAuthSession: () => ({
    authUser: { uid: "user-1" },
  }),
}));

jest.mock("@/services/supportService", () => ({
  supportService: {
    createReportId: jest.fn(() => "report-123456"),
    uploadReportMedia: jest.fn(),
    submitProblemReport: jest.fn(),
  },
}));

const mockedSupportService = jest.mocked(supportService);
const openURLSpy = jest.spyOn(Linking, "openURL");

describe("HelpReportProblemScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    openURLSpy.mockResolvedValue(undefined as never);
    openURLSpy.mockImplementation(mockOpenURL);
  });

  it("shows friendly fallback copy when backend submission fails", async () => {
    mockedSupportService.submitProblemReport.mockRejectedValueOnce(new Error("Firestore did not respond in time."));

    render(<HelpReportProblemScreen />);

    fireEvent.changeText(screen.getByPlaceholderText("Describe what you expected, what happened, and where you were in the app."), "It failed");
    fireEvent.press(screen.getByText("Submit Report"));

    await waitFor(() => {
      expect(mockOpenURL).toHaveBeenCalled();
    });

    expect(screen.getByText("We couldn't submit your report in the app, so we opened an email draft instead.")).toBeTruthy();
    expect(screen.queryByText(/Firestore|Firebase|INTERNAL/i)).toBeNull();
  });

  it("shows a success modal with the returned report reference", async () => {
    mockedSupportService.submitProblemReport.mockResolvedValueOnce({ reportId: "report-123456" });

    render(<HelpReportProblemScreen />);

    fireEvent.changeText(screen.getByPlaceholderText("Describe what you expected, what happened, and where you were in the app."), "It failed");
    fireEvent.press(screen.getByText("Submit Report"));

    await waitFor(() => {
      expect(screen.getByText("Report submitted")).toBeTruthy();
    });

    expect(screen.getByText("report-123456")).toBeTruthy();
    expect(screen.queryByText(/Problem report submitted\. Reference/i)).toBeNull();

    fireEvent.press(screen.getByText("OK"));
    expect(screen.queryByText("Report submitted")).toBeNull();
  });
});
