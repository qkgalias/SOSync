/** Purpose: Resolve SOS notification popup details from feed items plus current group data. */
import type { GroupMember, GroupStatus, NotificationFeedItem, SosEvent } from "@/types";
import { formatTimestampLabel, getSafetyStatusLabel, toInitials } from "@/utils/helpers";

export type SosNotificationDetail = {
  callerName: string;
  callerInitials: string;
  callerPhotoURL?: string;
  createdAtLabel: string;
  locationLabel: string;
  message: string;
  statusLabel: string;
};

export const getSosEventIdFromFeedItemId = (feedItemId: string) =>
  feedItemId.startsWith("sos:") ? feedItemId.slice(4) : null;

export const formatSosCoordinateLabel = (event?: Pick<SosEvent, "latitude" | "longitude"> | null) => {
  if (!event) {
    return "Location unavailable";
  }

  return `${event.latitude.toFixed(5)}, ${event.longitude.toFixed(5)}`;
};

export const buildSosNotificationDetail = ({
  event,
  item,
  locationLabel,
  member,
  status,
}: {
  event?: SosEvent | null;
  item: NotificationFeedItem;
  locationLabel?: string | null;
  member?: GroupMember | null;
  status?: GroupStatus | null;
}): SosNotificationDetail => {
  const callerName = member?.displayName?.trim() || "Trusted circle member";

  return {
    callerName,
    callerInitials: toInitials(callerName),
    callerPhotoURL: member?.photoURL,
    createdAtLabel: formatTimestampLabel(event?.createdAt ?? item.createdAt),
    locationLabel: locationLabel?.trim() || formatSosCoordinateLabel(event),
    message: event?.message?.trim() || item.body,
    statusLabel: getSafetyStatusLabel(status?.status ?? "unavailable"),
  };
};
