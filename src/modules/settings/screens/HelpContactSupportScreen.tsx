import * as Device from "expo-device";
import { useState } from "react";
import { useRouter } from "expo-router";
import { Linking, Text, TextInput, View } from "react-native";

import { BackButton } from "@/components/BackButton";
import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { SUPPORT_EMAIL, buildMailtoUrl, getResolvedAppVersion, getResolvedBuildLabel } from "@/modules/settings/helpAboutUtils";
import { useAppTheme } from "@/providers/AppThemeProvider";
import { goBackOrReplace } from "@/utils/helpers";

export default function HelpContactSupportScreen() {
  const router = useRouter();
  const { themeTokens } = useAppTheme();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage) {
      setError("Please tell us how we can help before sending your support request.");
      return;
    }

    setError("");
    const body = [
      "Support Request",
      "",
      trimmedMessage,
      "",
      `Device: ${Device.modelName ?? "Unknown device"}`,
      `App Version: ${getResolvedAppVersion()}`,
      `Build: ${getResolvedBuildLabel()}`,
    ].join("\n");

    await Linking.openURL(
      buildMailtoUrl({
        to: SUPPORT_EMAIL,
        subject: "SOSync Support Request",
        body,
      }),
    );
  };

  return (
    <Screen
      contentClassName="pb-10"
      leftSlot={<BackButton onPress={() => goBackOrReplace(router, "/help")} />}
      subtitle="Our support team is here to help. Please provide some details."
      title={"Contact SOSync\nSupport"}
    >
      <View className="mt-6">
        <Text className="mb-3 text-[13px] font-medium text-ink">Your Message:</Text>
        <TextInput
          multiline
          className="min-h-[136px] rounded-[16px] border border-line bg-input px-4 py-4 text-[15px] leading-6 text-ink"
          onChangeText={(value) => {
            setMessage(value);
            if (error) {
              setError("");
            }
          }}
          placeholder="Write your message or question here..."
          placeholderTextColor={themeTokens.textMuted}
          textAlignVertical="top"
          value={message}
        />
        {error ? <Text className="mt-2 text-[12px] leading-5 text-dangerText">{error}</Text> : null}

        <Button
          className="mt-8 min-h-12 self-center rounded-full px-8"
          label="Send Support Request"
          onPress={() => {
            void handleSubmit();
          }}
        />
      </View>
    </Screen>
  );
}
