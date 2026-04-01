/** Purpose: Verify notification tabs, SOS popup behavior, and alert routing. */
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import NotificationsScreen from "@/modules/notifications/screens/NotificationsScreen";

const mockPush = jest.fn();
const mockMarkAsRead = jest.fn();
const mockReverseGeocode = jest.fn();
const mockListenToSosEvents = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

jest.mock("@expo/vector-icons", () => ({
  MaterialCommunityIcons: ({ name }: { name: string }) => {
    const { Text } = require("react-native");
    return <Text>{name}</Text>;
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

jest.mock("@/hooks/useGroupMembers", () => ({
  useGroupMembers: () => [
    {
      userId: "user-2",
      groupId: "group-1",
      displayName: "Ari Santos",
      role: "member",
      joinedAt: "2026-03-01T00:00:00.000Z",
    },
  ],
}));

jest.mock("@/hooks/useGroupStatuses", () => ({
  useGroupStatuses: () => [
    {
      groupId: "group-1",
      userId: "user-2",
      status: "need_help",
      updatedAt: "2026-03-28T11:00:00.000Z",
    },
  ],
}));

jest.mock("@/services/locationService", () => ({
  locationService: {
    reverseGeocode: (...args: unknown[]) => mockReverseGeocode(...args),
  },
}));

jest.mock("@/services/firestoreService", () => ({
  firestoreService: {
    listenToSosEvents: (...args: unknown[]) => mockListenToSosEvents(...args),
  },
}));

jest.mock("@/hooks/useNotifications", () => ({
  useNotifications: () => ({
    items: [
      {
        id: "alert:disaster-1",
        groupId: "group-1",
        kind: "disaster",
        title: "Flood watch",
        body: "Heavy rainfall is expected in your area.",
        createdAt: "2026-03-28T10:00:00.000Z",
        readAt: "2026-03-28T10:30:00.000Z",
        targetRoute: "/alerts/disaster-1",
      },
      {
        id: "read-item",
        groupId: "group-1",
        kind: "sos",
        title: "Earlier trusted circle SOS",
        body: "This item was already read.",
        createdAt: "2026-03-27T12:00:00.000Z",
        readAt: "2026-03-27T13:00:00.000Z",
        actorUserId: "user-2",
      },
      {
        id: "sos:event-1",
        groupId: "group-1",
        kind: "sos",
        title: "Trusted circle SOS",
        body: "Immediate assistance requested.",
        createdAt: "2026-03-28T11:00:00.000Z",
        readAt: null,
        actorUserId: "user-2",
      },
    ],
    unreadItems: [
      {
        id: "sos:event-1",
        groupId: "group-1",
        kind: "sos",
        title: "Trusted circle SOS",
        body: "Immediate assistance requested.",
        createdAt: "2026-03-28T11:00:00.000Z",
        readAt: null,
        actorUserId: "user-2",
      },
    ],
    markAsRead: mockMarkAsRead,
  }),
}));

describe("NotificationsScreen", () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockMarkAsRead.mockReset();
    mockReverseGeocode.mockReset();
    mockListenToSosEvents.mockReset();
    mockReverseGeocode.mockResolvedValue("Scout Chuatoco Ave, Quezon City");
    mockListenToSosEvents.mockImplementation((_groupId, callback) => {
      callback([
        {
          eventId: "event-1",
          groupId: "group-1",
          senderId: "user-2",
          message: "Need help at the east entrance.",
          latitude: 14.6345,
          longitude: 121.0437,
          createdAt: "2026-03-28T11:00:00.000Z",
          status: "active",
        },
      ]);
      return jest.fn();
    });
  });

  it("opens on Unread first and shows All second", () => {
    render(<NotificationsScreen />);

    expect(screen.getByText("Unread")).toBeTruthy();
    expect(screen.getByText("All")).toBeTruthy();
    expect(screen.getByText("Trusted circle SOS")).toBeTruthy();
    expect(screen.queryByText("Earlier trusted circle SOS")).toBeNull();
  });

  it("shows read items after switching to All", () => {
    render(<NotificationsScreen />);

    fireEvent.press(screen.getByText("All"));

    expect(screen.getByText("Earlier trusted circle SOS")).toBeTruthy();
    expect(screen.getByText("Trusted circle SOS")).toBeTruthy();
  });

  it("opens an SOS detail popup instead of routing away", async () => {
    render(<NotificationsScreen />);

    fireEvent.press(screen.getByText("Trusted circle SOS"));

    await waitFor(() => {
      expect(mockMarkAsRead).toHaveBeenCalledWith("sos:event-1");
      expect(screen.getByText("SOS Details")).toBeTruthy();
      expect(screen.getByText("Ari Santos")).toBeTruthy();
      expect(screen.getByText("Need Help")).toBeTruthy();
      expect(screen.getByText("Scout Chuatoco Ave, Quezon City")).toBeTruthy();
    });

    expect(mockPush).not.toHaveBeenCalled();
  });

  it("keeps disaster notifications on the alert detail route", async () => {
    render(<NotificationsScreen />);

    fireEvent.press(screen.getByText("All"));
    fireEvent.press(screen.getByText("Flood watch"));

    await waitFor(() => {
      expect(mockMarkAsRead).toHaveBeenCalledWith("alert:disaster-1");
      expect(mockPush).toHaveBeenCalledWith("/alerts/disaster-1");
    });
  });
});
