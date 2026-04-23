/** Purpose: Provide signed-in support and app information in a Figma-aligned help and about layout. */
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { Linking, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useState } from "react";

import { BackButton } from "@/components/BackButton";
import { Screen } from "@/components/Screen";
import { SettingsRow } from "@/components/SettingsRow";
import { useAppTheme } from "@/providers/AppThemeProvider";
import { goBackOrReplace } from "@/utils/helpers";

type HelpModalKey = "usage" | "faq" | "about" | null;

const HELP_MODAL_CONTENT = {
  usage: {
    title: "Emergency Usage Guide",
    sections: [
      {
        title: "Use SOS only for real emergencies",
        body: "Trigger SOS when you need urgent help from your trusted circle, and make sure your location permission is enabled so people can reach you faster.",
      },
      {
        title: "Keep your circle updated",
        body: "Use your shared safety status and live location features so the people in your circle can understand your situation before or after an SOS is sent.",
      },
      {
        title: "Use official emergency hotlines when needed",
        body: "SOSync helps your trusted circle coordinate quickly, but official emergency services and hotlines should still be used for immediate public response.",
      },
    ],
  },
  faq: {
    title: "FAQs",
    sections: [
      {
        title: "How do I join a circle?",
        body: "Open Profile, tap Join circle, and enter the permanent 6-digit code shared by the circle owner or admin.",
      },
      {
        title: "Can I belong to more than one circle?",
        body: "Yes. SOSync keeps your memberships and lets you switch the active circle from the Account screen.",
      },
      {
        title: "Will my own SOS appear as a notification?",
        body: "No. The notification feed suppresses your own SOS events so Alerts only surface SOS activity from other people in your circle.",
      },
    ],
  },
  about: {
    title: "About the App",
    sections: [
      {
        title: "What SOSync is for",
        body: "SOSync is a safety and social-support app focused on trusted-circle coordination, live location sharing, alerts, and SOS response during emergencies.",
      },
      {
        title: "Current rollout",
        body: "This build is designed to feel deployment-ready while the team continues refining the product for Android-first release quality.",
      },
    ],
  },
} satisfies Record<Exclude<HelpModalKey, null>, { title: string; sections: Array<{ title: string; body: string }> }>;

const HelpModal = ({
  modalKey,
  onClose,
}: {
  modalKey: Exclude<HelpModalKey, null>;
  onClose: () => void;
}) => {
  const content = HELP_MODAL_CONTENT[modalKey];
  const { themeTokens } = useAppTheme();

  return (
    <Modal animationType="fade" transparent visible onRequestClose={onClose}>
      <View className="flex-1 justify-center bg-black/35 px-6 py-10">
        <Pressable className="absolute inset-0" onPress={onClose} />
        <View className="max-h-[78%] rounded-[28px] bg-panel px-6 pb-5 pt-6">
          <View className="mb-4 flex-row items-start justify-between">
            <View className="mr-4 flex-1">
              <Text className="text-[24px] font-semibold text-ink">{content.title}</Text>
              <Text className="mt-2 text-sm leading-6 text-muted">In-app guidance for the current SOSync build.</Text>
            </View>
            <Pressable className="h-9 w-9 items-center justify-center" hitSlop={10} onPress={onClose}>
              <MaterialCommunityIcons color={themeTokens.accentPrimary} name="close" size={22} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {content.sections.map((section) => (
              <View key={section.title} className="mb-5">
                <Text className="text-[15px] font-semibold text-ink">{section.title}</Text>
                <Text className="mt-2 text-[14px] leading-6 text-muted">{section.body}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

export default function HelpScreen() {
  const router = useRouter();
  const { themeTokens } = useAppTheme();
  const version = Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? "1.0.0";
  const [modalKey, setModalKey] = useState<HelpModalKey>(null);

  return (
    <Screen
      title="Help and About"
      centerTitle
      leftSlot={<BackButton onPress={() => goBackOrReplace(router, "/general")} />}
      contentClassName="pb-10"
    >
      <Text className="mb-5 pt-4 text-[16px] font-semibold text-ink">Support & Resources</Text>
      <View>
        <SettingsRow
          className="rounded-[22px]"
          icon={<MaterialCommunityIcons color={themeTokens.accentPrimary} name="medical-bag" size={22} />}
          onPress={() => setModalKey("usage")}
          subtitle="Learn how to use SOS and stay safe"
          title="Emergency Usage Guide"
        />
        <SettingsRow
          className="rounded-[22px]"
          icon={<MaterialCommunityIcons color={themeTokens.accentPrimary} name="comment-question-outline" size={22} />}
          onPress={() => setModalKey("faq")}
          subtitle="Find answers to common questions"
          title="FAQs"
        />
        <SettingsRow
          className="rounded-[22px]"
          icon={<MaterialCommunityIcons color={themeTokens.accentPrimary} name="help-circle-outline" size={22} />}
          onPress={() => Linking.openURL("mailto:support@sosync.app?subject=SOSync%20Support")}
          subtitle="Get help from our team"
          title="Contact Support"
        />
        <SettingsRow
          className="rounded-[22px]"
          icon={<MaterialCommunityIcons color={themeTokens.accentPrimary} name="alert-outline" size={22} />}
          onPress={() => Linking.openURL("mailto:support@sosync.app?subject=SOSync%20Problem%20Report")}
          subtitle="Submit feedback or report an issue"
          title="Report a Problem"
        />
      </View>

      <Text className="mb-5 mt-8 text-[16px] font-semibold text-ink">About SOSync</Text>
      <View>
        <SettingsRow
          className="rounded-[22px]"
          icon={<MaterialCommunityIcons color={themeTokens.accentPrimary} name="account-group-outline" size={22} />}
          onPress={() => setModalKey("about")}
          subtitle="Learn about our mission and team"
          title="About the App"
        />
        <SettingsRow
          className="rounded-[22px]"
          icon={<MaterialCommunityIcons color={themeTokens.accentPrimary} name="cellphone-information" size={22} />}
          showChevron={false}
          subtitle=""
          title="App Version"
          trailingText={version}
        />
      </View>

      {modalKey ? <HelpModal modalKey={modalKey} onClose={() => setModalKey(null)} /> : null}
    </Screen>
  );
}
