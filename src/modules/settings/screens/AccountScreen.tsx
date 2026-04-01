/** Purpose: Keep the main account entry focused on profile info while routing circle management into deeper screens. */
import type { ReactNode } from "react";
import { Image, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { BackButton } from "@/components/BackButton";
import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { SettingsRow } from "@/components/SettingsRow";
import { useAuthSession } from "@/hooks/useAuthSession";
import { PROFILE_ACCENT } from "@/modules/settings/profileTheme";
import { goBackOrReplace, toInitials } from "@/utils/helpers";

const SectionCard = ({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) => (
  <View className="mb-6 rounded-[24px] bg-panel px-5 py-5">
    <Text className="mb-4 text-[19px] font-semibold text-ink">{title}</Text>
    {children}
  </View>
);

export default function AccountScreen() {
  const router = useRouter();
  const { authUser, profile } = useAuthSession();

  return (
    <Screen
      title="Account"
      centerTitle
      leftSlot={<BackButton onPress={() => goBackOrReplace(router, "/general")} />}
      contentClassName="pb-10"
    >
      <SectionCard title="Profile Information">
        <View className="flex-row items-center">
          <View className="h-14 w-14 items-center justify-center rounded-full bg-page/70">
            {profile?.photoURL ? (
              <Image className="h-14 w-14 rounded-full" resizeMode="cover" source={{ uri: profile.photoURL }} />
            ) : (
              <Text className="text-[20px] font-semibold text-profileAccent">{toInitials(profile?.name ?? "SOSync")}</Text>
            )}
          </View>

          <View className="ml-4 flex-1">
            <Text className="text-[21px] font-semibold text-ink">{profile?.name ?? "Responder"}</Text>
          </View>
        </View>

        <View className="mt-4 border-t border-line pt-4">
          <View className="mb-3 flex-row items-center">
            <MaterialCommunityIcons color={PROFILE_ACCENT} name="phone" size={20} />
            <Text className="ml-3 text-sm text-ink">
              {profile?.phoneNumber ?? authUser?.phoneNumber ?? "No phone number saved yet"}
            </Text>
          </View>
          <View className="flex-row items-center">
            <MaterialCommunityIcons color={PROFILE_ACCENT} name="email-outline" size={20} />
            <Text className="ml-3 text-sm text-ink">
              {profile?.email ?? authUser?.email ?? "No email saved yet"}
            </Text>
          </View>

          <Button
            className="mt-5 min-h-10 rounded-full bg-profileAccent px-4 py-2"
            label="Edit profile"
            onPress={() => router.push("/account/edit" as never)}
            textClassName="text-sm text-white"
          />
        </View>
      </SectionCard>

      <Text className="mb-3 mt-1 text-[16px] font-semibold text-ink">Circle Membership</Text>
      <SettingsRow
        className="rounded-[22px] px-5 py-5"
        icon={<MaterialCommunityIcons color={PROFILE_ACCENT} name="account-group-outline" size={22} />}
        onPress={() => router.push("/account/circles" as never)}
        title="View Joined Circles"
        titleClassName="text-[18px] font-medium text-ink"
      />
    </Screen>
  );
}
