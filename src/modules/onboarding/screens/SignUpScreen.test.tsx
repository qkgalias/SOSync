/** Purpose: Verify create-account validation and legal agreement behavior. */
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";

import SignUpScreen from "@/modules/onboarding/screens/SignUpScreen";

const mockReplace = jest.fn();
const mockSaveProfile = jest.fn();
const mockSendEmailOtp = jest.fn();
const mockSignUpWithEmail = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({
    canGoBack: jest.fn(() => false),
    back: jest.fn(),
    replace: mockReplace,
  }),
}));

jest.mock("@expo/vector-icons", () => ({
  MaterialCommunityIcons: ({ name }: { name: string }) => {
    const { Text } = jest.requireActual("react-native");
    return <Text>{name}</Text>;
  },
}));

jest.mock("@/components/AuthScreen", () => ({
  AuthScreen: ({ children, hero, topSlot }: { children: ReactNode; hero?: ReactNode; topSlot?: ReactNode }) => {
    const { View } = jest.requireActual("react-native");
    return (
      <View>
        {topSlot}
        {hero}
        {children}
      </View>
    );
  },
}));

jest.mock("@/components/BackButton", () => ({
  BackButton: () => null,
}));

jest.mock("@/components/Button", () => ({
  Button: ({ label, loading, onPress }: { label: string; loading?: boolean; onPress: () => void }) => {
    const { Pressable, Text } = jest.requireActual("react-native");
    return (
      <Pressable disabled={loading} onPress={onPress}>
        <Text>{label}</Text>
      </Pressable>
    );
  },
}));

jest.mock("@/hooks/useAuthSession", () => ({
  useAuthSession: () => ({
    saveProfile: mockSaveProfile,
    sendEmailOtp: mockSendEmailOtp,
    signUpWithEmail: mockSignUpWithEmail,
  }),
}));

jest.mock("@/providers/AppThemeProvider", () => ({
  useAppTheme: () => ({
    resolvedTheme: "light",
    themeTokens: {
      accentPrimary: "#7C2C2C",
      textMuted: "#666666",
    },
  }),
}));

const fillValidSignupForm = () => {
  fireEvent.changeText(screen.getByPlaceholderText("First Name"), "Jake");
  fireEvent.changeText(screen.getByPlaceholderText("Last Name"), "Responder");
  fireEvent.changeText(screen.getByPlaceholderText("912 345 6789"), "09123456789");
  fireEvent.changeText(screen.getByPlaceholderText("Email"), "USER@GMAIL.COM");
  fireEvent.changeText(screen.getByPlaceholderText("Password"), "LongpasswordA");
  fireEvent.changeText(screen.getByPlaceholderText("Confirm Password"), "LongpasswordA");
};

describe("SignUpScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSaveProfile.mockResolvedValue(undefined);
    mockSendEmailOtp.mockResolvedValue(undefined);
    mockSignUpWithEmail.mockResolvedValue(undefined);
  });

  it("blocks signup until the user agrees to terms and privacy", async () => {
    render(<SignUpScreen />);

    fillValidSignupForm();
    fireEvent.press(screen.getByText("Continue"));

    expect(await screen.findByText("Agree to the Terms of Service and Privacy Policy to continue.")).toBeTruthy();
    expect(mockSignUpWithEmail).not.toHaveBeenCalled();
  });

  it("sanitizes first and last name input while typing", () => {
    render(<SignUpScreen />);

    fireEvent.changeText(screen.getByPlaceholderText("First Name"), "Ja1-ke!");
    fireEvent.changeText(screen.getByPlaceholderText("Last Name"), "Dela@ Cruz2");

    expect(screen.getByDisplayValue("Jake")).toBeTruthy();
    expect(screen.getByDisplayValue("Dela Cruz")).toBeTruthy();
  });

  it("submits valid checked signup data through the existing signup path", async () => {
    render(<SignUpScreen />);

    fillValidSignupForm();
    fireEvent.press(screen.getByLabelText("Agree to Terms of Service and Privacy Policy"));
    fireEvent.press(screen.getByText("Continue"));

    await waitFor(() => {
      expect(mockSignUpWithEmail).toHaveBeenCalledWith("Jake Responder", "user@gmail.com", "LongpasswordA");
    });
    expect(mockSaveProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "user@gmail.com",
        name: "Jake Responder",
        phoneNumber: "+63 912 345 6789",
      }),
    );
    expect(mockSendEmailOtp).toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith("/(onboarding)/verification");
  });

  it("keeps legal text tappable for in-app summaries", () => {
    render(<SignUpScreen />);

    fireEvent.press(screen.getByText("Terms of Service"));
    expect(screen.getByText("Using SOSync")).toBeTruthy();
  });
});
