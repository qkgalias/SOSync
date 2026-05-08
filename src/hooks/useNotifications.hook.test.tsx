/** Purpose: Verify the live notification hook respects active circle membership boundaries. */
import { Text } from "react-native";
import { render, screen, waitFor } from "@testing-library/react-native";

import { useNotifications } from "@/hooks/useNotifications";
import { firestoreService } from "@/services/firestoreService";
import type { DisasterAlert, GroupMember, NotificationReadReceipt, SosEvent } from "@/types";

jest.mock("@/services/firestoreService", () => ({
  firestoreService: {
    listenToAlerts: jest.fn(),
    listenToGroupMember: jest.fn(),
    listenToNotificationReads: jest.fn(),
    listenToSosEvents: jest.fn(),
    markNotificationRead: jest.fn(),
  },
}));

const mockedFirestoreService = jest.mocked(firestoreService);

const alertBeforeJoin: DisasterAlert = {
  alertId: "old-alert",
  createdAt: "2026-05-07T09:00:00.000Z",
  groupId: "group-1",
  latitude: 10.3,
  longitude: 123.9,
  message: "Old alert",
  severity: "watch",
  source: "manual",
  title: "Old alert",
  type: "storm",
};

const alertAfterJoin: DisasterAlert = {
  ...alertBeforeJoin,
  alertId: "new-alert",
  createdAt: "2026-05-07T11:00:00.000Z",
  message: "New alert",
  title: "New alert",
};

const sosBeforeJoin: SosEvent = {
  createdAt: "2026-05-07T09:30:00.000Z",
  eventId: "old-sos",
  groupId: "group-1",
  latitude: 10.3,
  longitude: 123.9,
  message: "Old SOS",
  senderId: "user-2",
  status: "active",
};

const sosAfterJoin: SosEvent = {
  ...sosBeforeJoin,
  createdAt: "2026-05-07T11:30:00.000Z",
  eventId: "new-sos",
  message: "New SOS",
};

const emptyBlockedUsers: string[] = [];

function Probe() {
  const { items, unreadCount } = useNotifications("group-1", "user-1", emptyBlockedUsers);

  return (
    <>
      <Text>count:{unreadCount}</Text>
      {items.map((item) => (
        <Text key={item.id}>{item.title}</Text>
      ))}
    </>
  );
}

const wireListeners = (member: GroupMember | null) => {
  mockedFirestoreService.listenToGroupMember.mockImplementation((_groupId, _userId, callback) => {
    callback(member);
    return jest.fn();
  });
  mockedFirestoreService.listenToAlerts.mockImplementation((_groupId, callback) => {
    callback([alertBeforeJoin, alertAfterJoin]);
    return jest.fn();
  });
  mockedFirestoreService.listenToSosEvents.mockImplementation((_groupId, callback) => {
    callback([sosBeforeJoin, sosAfterJoin]);
    return jest.fn();
  });
  mockedFirestoreService.listenToNotificationReads.mockImplementation((_userId, callback) => {
    callback([] as NotificationReadReceipt[]);
    return jest.fn();
  });
};

describe("useNotifications membership cutoff", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("hides alerts and SOS items created before the current user joined", async () => {
    wireListeners({
      displayName: "Current User",
      groupId: "group-1",
      joinedAt: "2026-05-07T10:00:00.000Z",
      role: "member",
      userId: "user-1",
    });

    render(<Probe />);

    await waitFor(() => {
      expect(screen.getByText("New alert")).toBeTruthy();
      expect(screen.getByText("Trusted circle SOS")).toBeTruthy();
      expect(screen.getByText("count:2")).toBeTruthy();
    });

    expect(screen.queryByText("Old alert")).toBeNull();
    expect(screen.queryByText("Old SOS")).toBeNull();
  });

  it("shows no group notifications when the active membership is missing", async () => {
    wireListeners(null);

    render(<Probe />);

    await waitFor(() => {
      expect(screen.getByText("count:0")).toBeTruthy();
    });

    expect(screen.queryByText("Old alert")).toBeNull();
    expect(screen.queryByText("New alert")).toBeNull();
    expect(screen.queryByText("Trusted circle SOS")).toBeNull();
  });
});
