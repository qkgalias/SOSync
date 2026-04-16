/** Purpose: Verify the shared bottom nav renders the unread alerts badge correctly. */
import { render, screen } from "@testing-library/react-native";

import { PrototypeTabBar } from "@/components/PrototypeTabBar";

const mockNavigate = jest.fn();
const mockUseNotifications = jest.fn();

jest.mock("@expo/vector-icons", () => ({
  MaterialCommunityIcons: ({ name }: { name: string }) => {
    const { Text } = require("react-native");
    return <Text>{name}</Text>;
  },
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({
    bottom: 0,
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

jest.mock("@/hooks/useAuthSession", () => ({
  useAuthSession: () => ({
    authUser: { uid: "user-1" },
    selectedGroupId: "group-1",
  }),
}));

jest.mock("@/hooks/useBlockedUsers", () => ({
  useBlockedUsers: () => ({
    blockedUserIds: [],
  }),
}));

jest.mock("@/hooks/useNotifications", () => ({
  useNotifications: (...args: unknown[]) => mockUseNotifications(...args),
}));

const buildProps = () =>
  ({
    state: {
      index: 0,
      key: "tab-state",
      routeNames: ["home", "hotlines", "sos", "notifications", "profile"],
      routes: [
        { key: "home-key", name: "home" },
        { key: "hotlines-key", name: "hotlines" },
        { key: "sos-key", name: "sos" },
        { key: "notifications-key", name: "notifications" },
        { key: "profile-key", name: "profile" },
      ],
      history: [],
      stale: false,
      type: "tab",
    },
    descriptors: {
      "home-key": { options: { title: "Home" } },
      "hotlines-key": { options: { title: "Hotlines" } },
      "sos-key": { options: { title: "SOS" } },
      "notifications-key": { options: { title: "Alerts" } },
      "profile-key": { options: { title: "Profile" } },
    },
    navigation: {
      navigate: mockNavigate,
    },
  }) as any;

describe("PrototypeTabBar", () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockUseNotifications.mockReset();
  });

  it("does not render a badge when there are no unread notifications", () => {
    mockUseNotifications.mockReturnValue({
      items: [],
      unreadItems: [],
      unreadCount: 0,
      markAsRead: jest.fn(),
    });

    render(<PrototypeTabBar {...buildProps()} />);

    expect(screen.queryByText("9+")).toBeNull();
    expect(screen.queryByText("1")).toBeNull();
  });

  it("renders the exact unread count up to nine", () => {
    mockUseNotifications.mockReturnValue({
      items: [],
      unreadItems: [{ id: "1" }, { id: "2" }, { id: "3" }],
      unreadCount: 3,
      markAsRead: jest.fn(),
    });

    render(<PrototypeTabBar {...buildProps()} />);

    expect(screen.getByText("3")).toBeTruthy();
  });

  it("caps the badge at 9+ for larger unread counts", () => {
    mockUseNotifications.mockReturnValue({
      items: [],
      unreadItems: Array.from({ length: 12 }, (_, index) => ({ id: `${index}` })),
      unreadCount: 12,
      markAsRead: jest.fn(),
    });

    render(<PrototypeTabBar {...buildProps()} />);

    expect(screen.getByText("9+")).toBeTruthy();
  });
});
