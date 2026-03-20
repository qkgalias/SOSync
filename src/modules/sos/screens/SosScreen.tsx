/** Purpose: Give users a deliberate, high-visibility way to dispatch an SOS update. */
import { useState } from "react";
import { Text } from "react-native";

import { HoldToConfirmButton } from "@/components/HoldToConfirmButton";
import { InfoCard } from "@/components/InfoCard";
import { Screen } from "@/components/Screen";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useGroups } from "@/hooks/useGroups";
import { useHotlines } from "@/hooks/useHotlines";
import { useLocation } from "@/hooks/useLocation";
import { QuickCallList } from "@/modules/sos/components/QuickCallList";
import { firestoreService } from "@/services/firestoreService";
import { locationService } from "@/services/locationService";
import { toDistanceLabel } from "@/utils/helpers";

export default function SosScreen() {
  const { authUser, profile } = useAuthSession();
  const { selectedGroupId } = useGroups();
  const hotlines = useHotlines();
  const { currentLocation, nearestCenter } = useLocation(
    authUser?.uid,
    selectedGroupId,
    Boolean(profile?.privacy.locationSharingEnabled),
  );
  const [confirmationLabel, setConfirmationLabel] = useState("Hold to send");
  const centerDistance =
    currentLocation && nearestCenter ? locationService.distanceBetween(currentLocation, nearestCenter) : null;

  const handleSendSos = async () => {
    if (!authUser?.uid || !selectedGroupId || !currentLocation) {
      setConfirmationLabel("Location required");
      return;
    }

    await firestoreService.createSosEvent({
      groupId: selectedGroupId,
      senderId: authUser.uid,
      message: "Immediate assistance requested. Check the live map for my current location.",
      latitude: currentLocation.latitude,
      longitude: currentLocation.longitude,
    });
    setConfirmationLabel("SOS sent");
  };

  return (
    <Screen title="Emergency dispatch" subtitle="Send a trusted-circle SOS and see the fastest nearby evacuation option.">
      <HoldToConfirmButton
        label="SOS"
        helperText="Long-press to avoid accidental alerts. Your location is sent only to your selected trusted circle."
        onConfirm={handleSendSos}
      />
      <InfoCard title="Dispatch status" eyebrow="Live">
        <Text className="text-base font-semibold text-ink">{confirmationLabel}</Text>
        <Text className="mt-2 text-sm leading-6 text-muted">
          {currentLocation
            ? `Current coordinates: ${currentLocation.latitude.toFixed(4)}, ${currentLocation.longitude.toFixed(4)}`
            : "Enable location to attach your current position to the SOS event."}
        </Text>
        {nearestCenter ? (
          <Text className="mt-3 text-sm leading-6 text-muted">
            Closest evacuation center: {nearestCenter.name}
            {centerDistance ? ` (${toDistanceLabel(centerDistance)} away).` : "."}
          </Text>
        ) : null}
      </InfoCard>
      <QuickCallList hotlines={hotlines.slice(0, 3)} />
    </Screen>
  );
}
