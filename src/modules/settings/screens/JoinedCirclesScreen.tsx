/** Purpose: Show every circle the user belongs to before routing into a dedicated circle-detail view. */
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { BackButton } from "@/components/BackButton";
import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { useAuthSession } from "@/hooks/useAuthSession";
import { PROFILE_ACCENT, getCircleRoleLabel } from "@/modules/settings/profileTheme";
import { goBackOrReplace } from "@/utils/helpers";

export default function JoinedCirclesScreen() {
  const router = useRouter();
  const { authUser, groups, selectedGroupId } = useAuthSession();

  return (
    <Screen
      title="Joined Circles"
      centerTitle
      leftSlot={<BackButton onPress={() => goBackOrReplace(router, "/account")} />}
      rightSlot={
        <Pressable
          className="h-11 w-11 items-center justify-center"
          hitSlop={10}
          onPress={() => router.push("/circle/create" as never)}
        >
          <MaterialCommunityIcons color={PROFILE_ACCENT} name="plus" size={28} />
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
                      <View className="mr-2 rounded-full bg-white/55 px-3 py-1">
                        <Text className="text-xs font-semibold uppercase tracking-[0.08em] text-muted/80">
                          Active
                        </Text>
                      </View>
                    ) : null}
                    <MaterialCommunityIcons color="#111111" name="chevron-right" size={24} />
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
    </Screen>
  );
}
