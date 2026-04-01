/** Purpose: Render the production-styled SOS flow with a deliberate countdown and trusted-circle alerting. */
import { useEffect, useMemo, useRef, useState } from "react";
import { Image, Pressable, Text, View, useWindowDimensions } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { Button } from "@/components/Button";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useBlockedUsers } from "@/hooks/useBlockedUsers";
import { useGroupMembers } from "@/hooks/useGroupMembers";
import { useLocation } from "@/hooks/useLocation";
import { SlideToCancel } from "@/modules/sos/components/SlideToCancel";
import { firestoreService } from "@/services/firestoreService";
import { USER_SEED } from "@/utils/constants";
import { toInitials } from "@/utils/helpers";

const COUNTDOWN_SECONDS = 10;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const IDLE_STATUS = "Tap or hold to send an SOS to everyone.";

const AvatarOrbit = ({
  avatarSize,
  index,
  member,
  radius,
  total,
}: {
  avatarSize: number;
  index: number;
  member: { displayName: string; photoURL?: string };
  radius: number;
  total: number;
}) => {
  const angle = (-Math.PI / 2) + (Math.PI * 2 * index) / Math.max(total, 1);
  const center = radius + avatarSize / 2;
  const left = center + Math.cos(angle) * radius - avatarSize / 2;
  const top = center + Math.sin(angle) * radius - avatarSize / 2;

  return (
    <View
      className="absolute items-center justify-center rounded-full border-2 border-white bg-white"
      style={{ height: avatarSize, left, top, width: avatarSize }}
    >
      {member.photoURL ? (
        <Image
          className="rounded-full"
          resizeMode="cover"
          source={{ uri: member.photoURL }}
          style={{ height: avatarSize - 4, width: avatarSize - 4 }}
        />
      ) : (
        <Text className="text-sm font-semibold text-accent">{toInitials(member.displayName)}</Text>
      )}
    </View>
  );
};

export default function SosScreen() {
  const { height, width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { authUser, profile, selectedGroupId } = useAuthSession();
  const { blockedUserIds } = useBlockedUsers(authUser?.uid);
  const privacy = profile?.privacy ?? USER_SEED.privacy;
  const members = useGroupMembers(selectedGroupId).filter((member) => !blockedUserIds.includes(member.userId));
  const { currentLocation } = useLocation(
    authUser?.uid,
    selectedGroupId,
    Boolean(privacy.locationSharingEnabled),
    blockedUserIds,
  );
  const [countdown, setCountdown] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState(IDLE_STATUS);
  const sendingRef = useRef(false);

  const recipientCount = Math.max(members.length - 1, 0);
  const orbitMembers = useMemo(
    () => members.filter((member) => member.userId !== authUser?.uid).slice(0, 4),
    [authUser?.uid, members],
  );

  const ringOuterSize = clamp(Math.min(width * 0.76, height * 0.42), 250, 336);
  const ringMiddleSize = ringOuterSize * 0.82;
  const ringInnerSize = ringOuterSize * 0.64;
  const avatarSize = clamp(width * 0.11, 38, 48);
  const orbitRadius = ringOuterSize * 0.48;
  const orbitContainerSize = orbitRadius * 2 + avatarSize;

  const startCountdown = () => {
    if (countdown !== null || sendingRef.current) {
      return;
    }

    setStatusMessage("After the countdown starts, slide to cancel if you need to stop.");
    setCountdown(COUNTDOWN_SECONDS);
  };

  const cancelCountdown = () => {
    setCountdown(null);
    setStatusMessage(IDLE_STATUS);
  };

  useEffect(() => {
    if (countdown === null || countdown <= 0) {
      return;
    }

    const timeout = setTimeout(() => setCountdown((value) => (value === null ? null : value - 1)), 1000);
    return () => clearTimeout(timeout);
  }, [countdown]);

  useEffect(() => {
    if (countdown !== 0 || sendingRef.current) {
      return;
    }

    const send = async () => {
      if (!authUser?.uid) {
        setStatusMessage("Sign in is required before SOS can be sent.");
        setCountdown(null);
        return;
      }

      if (!selectedGroupId) {
        setStatusMessage("Join a trusted circle first so SOS has someone to reach.");
        setCountdown(null);
        return;
      }

      if (!currentLocation) {
        setStatusMessage("Location is required before SOS can be sent.");
        setCountdown(null);
        return;
      }

      sendingRef.current = true;

      try {
        await firestoreService.createSosEvent({
          groupId: selectedGroupId,
          senderId: authUser.uid,
          message: "Immediate assistance requested. Check the live map for my current location.",
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
        });
        setStatusMessage(
          recipientCount > 0
            ? `SOS sent to ${recipientCount} ${recipientCount === 1 ? "person" : "people"}.`
            : "SOS sent.",
        );
      } catch (error) {
        setStatusMessage(error instanceof Error ? error.message : "Unable to send the SOS right now.");
      } finally {
        setCountdown(null);
        sendingRef.current = false;
      }
    };

    void send();
  }, [authUser?.uid, countdown, currentLocation, recipientCount, selectedGroupId]);

  const primaryMessage =
    countdown !== null
      ? `After ${countdown} seconds, your SOS will be sent to ${recipientCount} ${recipientCount === 1 ? "person" : "people"}.`
      : statusMessage === IDLE_STATUS
        ? "Your trusted circle will receive your latest status and location the moment SOS is sent."
        : statusMessage;

  return (
    <SafeAreaView className="flex-1 bg-accent" edges={["top", "left", "right"]}>
      <View className="flex-1 bg-accent px-6">
        <View className="items-center pt-3">
          <Text className="text-[34px] font-semibold tracking-[0.01em] text-white">SOS</Text>
        </View>

        <View
          className="flex-1 items-center justify-center"
          style={{
            paddingTop: clamp(height * 0.015, 8, 20),
            paddingBottom: clamp(height * 0.02, 12, 28),
          }}
        >
          <View
            className="items-center justify-center"
            style={{
              height: orbitContainerSize,
              width: orbitContainerSize,
            }}
          >
            <View
              className="absolute items-center justify-center rounded-full border-2 border-[#C11212]/95"
              style={{
                height: ringOuterSize,
                width: ringOuterSize,
              }}
            >
              <View
                className="items-center justify-center rounded-full border-2 border-[#C11212]/95"
                style={{
                  height: ringMiddleSize,
                  width: ringMiddleSize,
                }}
              >
                <Pressable
                  className="items-center justify-center rounded-full bg-[#CD5751]"
                  delayLongPress={450}
                  onLongPress={startCountdown}
                  onPress={startCountdown}
                  style={{
                    height: ringInnerSize,
                    width: ringInnerSize,
                  }}
                >
                  <MaterialCommunityIcons color="#FFFFFF" name="alarm-light" size={clamp(ringInnerSize * 0.22, 42, 60)} />
                  <Text className="mt-4 px-8 text-center text-[15px] leading-6 text-white">
                    {countdown !== null ? `Sending in ${countdown}s` : IDLE_STATUS}
                  </Text>
                </Pressable>
              </View>
            </View>

            {orbitMembers.map((member, index) => (
              <AvatarOrbit
                key={member.userId}
                avatarSize={avatarSize}
                index={index}
                member={{ displayName: member.displayName, photoURL: member.photoURL }}
                radius={orbitRadius}
                total={orbitMembers.length}
              />
            ))}
          </View>
        </View>

        <View
          className="pb-6"
          style={{
            paddingBottom: Math.max(insets.bottom, 18),
          }}
        >
          <Text className="text-[32px] leading-[46px] text-white">Take a breath, we’re here</Text>
          <Text className="mt-3 text-[15px] leading-6 text-white/90">{primaryMessage}</Text>

          {countdown !== null ? (
            <SlideToCancel active label="Slide to cancel" onComplete={cancelCountdown} />
          ) : (
            <Button
              className="mx-auto mt-8 w-[220px] rounded-full border border-[#5B231F] bg-white"
              label="Ready to send"
              onPress={startCountdown}
              textClassName="text-accent"
              variant="outline"
            />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}
