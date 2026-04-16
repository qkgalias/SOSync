/** Purpose: Show every circle the user belongs to before routing into a dedicated circle-detail view. */
import { Modal, Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useState } from "react";

import { BackButton } from "@/components/BackButton";
import { Button } from "@/components/Button";
import { JoinCircleModal } from "@/components/JoinCircleModal";
import { Screen } from "@/components/Screen";
import { useAuthSession } from "@/hooks/useAuthSession";
import { getCircleRoleLabel } from "@/modules/settings/profileTheme";
import { useAppTheme } from "@/providers/AppThemeProvider";
import { goBackOrReplace } from "@/utils/helpers";

export default function JoinedCirclesScreen() {
  const router = useRouter();
  const { authUser, groups, selectedGroupId } = useAuthSession();
  const { themeTokens } = useAppTheme();
  const [entryVisible, setEntryVisible] = useState(false);
  const [joinVisible, setJoinVisible] = useState(false);

  const handleOpenCreate = () => {
    setEntryVisible(false);
    router.push("/circle/create" as never);
  };

  const handleOpenJoin = () => {
    setEntryVisible(false);
    setJoinVisible(true);
  };

  return (
    <Screen
      title="Joined Circles"
      centerTitle
      leftSlot={<BackButton onPress={() => goBackOrReplace(router, "/account")} />}
      rightSlot={
        <Pressable
          className="h-11 w-11 items-center justify-center"
          hitSlop={10}
          onPress={() => setEntryVisible(true)}
        >
          <MaterialCommunityIcons color={themeTokens.accentPrimary} name="plus" size={28} />
        </Pressable>
      }
      contentClassName="pb-10"
    >
      {!groups.length ? (
        <View className="mt-7 rounded-[24px] bg-panel px-5 py-5">
          <Text className="text-[20px] font-semibold text-ink">No circles yet</Text>
          <Text className="mt-2 text-sm leading-6 text-muted">
            Create a circle to start sharing invite codes and managing memberships from one place.
          </Text>

          <Button
            className="mt-5 min-h-11 rounded-full bg-profileAccent"
            label="Create circle"
            onPress={() => router.push("/circle/create" as never)}
            textClassName="text-white"
          />
        </View>
      ) : (
        <View className="mt-7">
          {groups.map((circle) => {
            const isActive = circle.groupId === selectedGroupId;
            const roleLabel = getCircleRoleLabel(circle.ownerId === authUser?.uid, circle.memberRole);

            return (
              <Pressable
                key={circle.groupId}
                className="mb-4 rounded-[22px] bg-panel px-5 py-4"
                onPress={() => router.push(`/account/circle/${circle.groupId}` as never)}
              >
                <View className="flex-row items-center justify-between">
                  <View className="mr-4 flex-1">
                    <Text className="text-[18px] font-semibold text-ink">{circle.name}</Text>
                    <Text className="mt-1 text-sm leading-5 text-muted">
                      {circle.membersCount} {circle.membersCount === 1 ? "member" : "members"} · {roleLabel.toLowerCase()}
                    </Text>
                  </View>

                  <View className="flex-row items-center">
                    {isActive ? (
                      <View className="mr-2 rounded-full bg-page px-3 py-1">
                        <Text className="text-xs font-semibold uppercase tracking-[0.08em] text-muted/80">
                          Active
                        </Text>
                      </View>
                    ) : null}
                    <MaterialCommunityIcons color={themeTokens.textPrimary} name="chevron-right" size={24} />
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}

      <Modal animationType="fade" transparent visible={entryVisible} onRequestClose={() => setEntryVisible(false)}>
        <View className="flex-1 justify-end bg-black/30 px-6 py-8">
          <Pressable className="absolute inset-0" onPress={() => setEntryVisible(false)} />
          <View className="rounded-[28px] bg-panel px-5 pb-5 pt-6 shadow-soft">
            <View className="flex-row items-start justify-between">
              <View className="mr-4 flex-1">
                <Text className="text-[24px] font-semibold text-ink">Circle options</Text>
                <Text className="mt-2 text-sm leading-6 text-muted">
                  Create a new circle or join an existing one with a 6-digit invite code.
                </Text>
              </View>
              <Pressable className="h-9 w-9 items-center justify-center" hitSlop={10} onPress={() => setEntryVisible(false)}>
                <MaterialCommunityIcons color={themeTokens.accentPrimary} name="close" size={22} />
              </Pressable>
            </View>

            <Button
              className="mt-6 min-h-11 rounded-[16px] bg-profileAccent"
              label="Create circle"
              onPress={handleOpenCreate}
              textClassName="text-white"
            />
            <Button
              className="mt-3 min-h-11 rounded-[16px] border border-profileAccent bg-transparent"
              label="Join via code"
              onPress={handleOpenJoin}
              textClassName="text-profileAccent"
              variant="outline"
            />
          </View>
        </View>
      </Modal>

      <JoinCircleModal onClose={() => setJoinVisible(false)} visible={joinVisible} />
    </Screen>
  );
}
