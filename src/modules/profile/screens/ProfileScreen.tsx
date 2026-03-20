/** Purpose: Summarize the current responder profile and provide app-level actions. */
import { useRouter } from "expo-router";
import { Text, View } from "react-native";

import { Button } from "@/components/Button";
import { InfoCard } from "@/components/InfoCard";
import { Screen } from "@/components/Screen";
import { useAuthSession } from "@/hooks/useAuthSession";

export default function ProfileScreen() {
  const router = useRouter();
  const { groups, profile, signOut } = useAuthSession();

  return (
    <Screen title="Profile" subtitle="Review your safety settings, circles, and account access in one place.">
      <InfoCard title={profile?.name ?? "Responder"} eyebrow="Identity">
        <Text className="text-sm leading-6 text-muted">{profile?.email ?? "No email saved yet"}</Text>
        <Text className="mt-1 text-sm leading-6 text-muted">{profile?.phoneNumber ?? "No phone number saved yet"}</Text>
      </InfoCard>
      <InfoCard title="Privacy and safety" eyebrow="Preferences">
        <Text className="text-sm leading-6 text-muted">
          Location sharing: {profile?.privacy.locationSharingEnabled ? "enabled" : "paused"}
        </Text>
        <Text className="mt-1 text-sm leading-6 text-muted">
          Notification bundle: {profile?.preferences.disasterAlerts ? "on" : "off"}
        </Text>
        <Text className="mt-1 text-sm leading-6 text-muted">Trusted circles: {groups.length}</Text>
      </InfoCard>
      <View className="gap-3">
        <Button label="Open settings" onPress={() => router.push("/settings")} />
        <Button label="Help and FAQs" onPress={() => router.push("/help")} variant="secondary" />
        <Button label="Sign out" onPress={() => signOut()} variant="danger" />
      </View>
    </Screen>
  );
}
