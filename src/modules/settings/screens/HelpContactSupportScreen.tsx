import * as Device from "expo-device";
import { useState } from "react";
import { useRouter } from "expo-router";
import { Linking, Text, TextInput, View } from "react-native";

import { BackButton } from "@/components/BackButton";
import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { HelpSubmissionSuccessModal } from "@/modules/settings/components/HelpSubmissionSuccessModal";
import { SUPPORT_EMAIL, buildMailtoUrl, getResolvedAppVersion, getResolvedBuildLabel } from "@/modules/settings/helpAboutUtils";
import { SUPPORT_REQUEST_FALLBACK_MESSAGE, toSupportRequestErrorMessage } from "@/modules/settings/helpRequestErrors";
import { useAppTheme } from "@/providers/AppThemeProvider";
import { supportService } from "@/services/supportService";
import { goBackOrReplace } from "@/utils/helpers";

export default function HelpContactSupportScreen() {
  const router = useRouter();
  const { themeTokens } = useAppTheme();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [fallbackMessage, setFallbackMessage] = useState("");
  const [successRequestId, setSuccessRequestId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage) {
      setError("Please tell us how we can help before sending your support request.");
      return;
    }

    setError("");
    setFallbackMessage("");
    setSuccessRequestId(null);
    const body = [
      "Support Request",
      "",
      trimmedMessage,
      "",
      `Device: ${Device.modelName ?? "Unknown device"}`,
      `App Version: ${getResolvedAppVersion()}`,
      `Build: ${getResolvedBuildLabel()}`,
    ].join("\n");

    setSubmitting(true);
    try {
      const result = await supportService.submitSupportRequest({
        appVersion: getResolvedAppVersion(),
        buildLabel: getResolvedBuildLabel(),
        deviceModel: Device.modelName ?? "Unknown device",
        message: trimmedMessage,
      });
      setSuccessRequestId(result.requestId);
      setMessage("");
    } catch (submitError) {
      console.warn("Support backend submission failed; opening email fallback.", submitError);
      setError(toSupportRequestErrorMessage(submitError));
      await Linking.openURL(
        buildMailtoUrl({
          to: SUPPORT_EMAIL,
          subject: "SOSync Support Request",
          body,
        }),
      );
      setFallbackMessage(SUPPORT_REQUEST_FALLBACK_MESSAGE);
    } finally {
      setSubmitting(false);
    }
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
        {fallbackMessage ? <Text className="mt-2 text-[12px] leading-5 text-accent">{fallbackMessage}</Text> : null}

        <Button
          className="mt-8 min-h-12 self-center rounded-full px-8"
          disabled={submitting}
          label={submitting ? "Sending..." : "Send Support Request"}
          onPress={() => {
            void handleSubmit();
          }}
        />
      </View>
      <HelpSubmissionSuccessModal
        bodyPrefix="Thanks for reaching out. Your support reference is"
        onClose={() => setSuccessRequestId(null)}
        referenceId={successRequestId}
        title="Support request sent"
      />
    </Screen>
  );
}
