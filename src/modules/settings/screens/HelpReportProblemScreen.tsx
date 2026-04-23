import * as ImagePicker from "expo-image-picker";
import { useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { Linking, Pressable, Text, TextInput, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { BackButton } from "@/components/BackButton";
import { Button } from "@/components/Button";
import {
  REPORT_PROBLEM_CATEGORIES,
  type ReportProblemCategory,
} from "@/modules/settings/helpAboutContent";
import {
  SUPPORT_EMAIL,
  buildMailtoUrl,
  getResolvedAppVersion,
  getResolvedBuildLabel,
  getSelectedMediaLabel,
} from "@/modules/settings/helpAboutUtils";
import { Screen } from "@/components/Screen";
import { useAppTheme } from "@/providers/AppThemeProvider";
import { cn, goBackOrReplace } from "@/utils/helpers";

type SelectedMedia = {
  uri: string;
  fileName?: string | null;
  type?: string | null;
};

export default function HelpReportProblemScreen() {
  const router = useRouter();
  const { themeTokens } = useAppTheme();
  const [category, setCategory] = useState<ReportProblemCategory | null>(REPORT_PROBLEM_CATEGORIES[0] ?? null);
  const [otherReason, setOtherReason] = useState("");
  const [deviceModel, setDeviceModel] = useState("");
  const [selectedMedia, setSelectedMedia] = useState<SelectedMedia | null>(null);
  const [error, setError] = useState("");

  const needsOtherReason = category === "Other";
  const versionLabel = getResolvedAppVersion();
  const buildLabel = getResolvedBuildLabel();
  const technicalData = useMemo(() => `App Version: ${versionLabel} · Build: ${buildLabel}`, [buildLabel, versionLabel]);

  const handlePickMedia = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError("Photo library permission is required to choose a screenshot or video.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      allowsEditing: false,
      quality: 0.8,
    });

    if (result.canceled || !result.assets[0]?.uri) {
      return;
    }

    setSelectedMedia({
      uri: result.assets[0].uri,
      fileName: result.assets[0].fileName,
      type: result.assets[0].type,
    });
    setError("");
  };

  const handleSubmit = async () => {
    if (!category) {
      setError("Please choose an issue category before submitting your report.");
      return;
    }

    if (needsOtherReason && !otherReason.trim()) {
      setError("Please specify the other reason before submitting your report.");
      return;
    }

    setError("");

    const detailLines = [
      "Problem Report",
      "",
      `Category: ${category}`,
      needsOtherReason ? `Other reason: ${otherReason.trim()}` : null,
      `Device: ${deviceModel.trim() || "Not provided"}`,
      `Technical Data: ${technicalData}`,
      selectedMedia
        ? `Selected media: ${getSelectedMediaLabel(selectedMedia.uri, selectedMedia.fileName)} (attach manually from your mail app if needed)`
        : "Selected media: None",
    ].filter(Boolean);

    await Linking.openURL(
      buildMailtoUrl({
        to: SUPPORT_EMAIL,
        subject: `SOSync Problem Report - ${category}`,
        body: detailLines.join("\n"),
      }),
    );
  };

  return (
    <Screen
      contentClassName="pb-10"
      leftSlot={<BackButton onPress={() => goBackOrReplace(router, "/help")} />}
      subtitle="Our team is here to help. Select a category and provide details below."
      title="Report a Problem"
    >
      <View className="mt-6">
        <Text className="mb-3 text-[13px] font-medium text-ink">Issue Category:</Text>
        <View>
          {REPORT_PROBLEM_CATEGORIES.map((item) => {
            const selected = item === category;
            return (
              <Pressable
                key={item}
                className={cn(
                  "mb-2 flex-row items-center rounded-[12px] px-4 py-3",
                  selected ? "bg-panel" : "bg-page",
                )}
                onPress={() => {
                  setCategory(item);
                  if (item !== "Other") {
                    setOtherReason("");
                  }
                  if (error) {
                    setError("");
                  }
                }}
              >
                <MaterialCommunityIcons
                  color={selected ? themeTokens.accentPrimary : themeTokens.textMuted}
                  name={selected ? "check-circle" : "radiobox-blank"}
                  size={18}
                />
                <Text className="ml-3 text-[14px] text-ink">{item}</Text>
              </Pressable>
            );
          })}
        </View>

        {needsOtherReason ? (
          <View className="mt-4">
            <Text className="mb-3 text-[13px] font-medium text-ink">Please specify the other reason (required):</Text>
            <TextInput
              multiline
              className="min-h-[94px] rounded-[16px] border border-line bg-input px-4 py-4 text-[15px] leading-6 text-ink"
              onChangeText={(value) => {
                setOtherReason(value);
                if (error) {
                  setError("");
                }
              }}
              placeholder="Write what the reason here. (Be specific and detailed.)"
              placeholderTextColor={themeTokens.textMuted}
              textAlignVertical="top"
              value={otherReason}
            />
          </View>
        ) : null}

        <View className="mt-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-[13px] font-medium text-ink">Attach Screenshot (optional)</Text>
            <MaterialCommunityIcons color={themeTokens.textMuted} name="paperclip" size={18} />
          </View>
          <Pressable
            className="mt-2 flex-row items-center rounded-[14px] bg-panel px-4 py-3"
            onPress={() => {
              void handlePickMedia();
            }}
          >
            <MaterialCommunityIcons color={themeTokens.textPrimary} name="plus" size={18} />
            <Text className="ml-3 text-[14px] text-ink">
              {selectedMedia ? getSelectedMediaLabel(selectedMedia.uri, selectedMedia.fileName) : "Add Photo/Video"}
            </Text>
          </Pressable>
          {selectedMedia ? (
            <Text className="mt-2 text-[12px] leading-5 text-muted">
              Selected locally. You may need to attach it manually in your mail app before sending.
            </Text>
          ) : null}
        </View>

        <View className="mt-4">
          <Text className="mb-2 text-[13px] font-medium text-ink">Device:</Text>
          <TextInput
            className="rounded-[14px] border border-line bg-input px-4 py-3 text-[14px] text-ink"
            onChangeText={(value) => setDeviceModel(value)}
            placeholder="Enter your device model"
            placeholderTextColor={themeTokens.textMuted}
            value={deviceModel}
          />
        </View>

        <View className="mt-4">
          <Text className="text-[12px] uppercase tracking-[0.08em] text-muted">Technical Data:</Text>
          <Text className="mt-2 text-[13px] leading-5 text-muted">{technicalData}</Text>
        </View>

        {error ? <Text className="mt-3 text-[12px] leading-5 text-dangerText">{error}</Text> : null}

        <Button
          className="mt-8 min-h-12 self-center rounded-full px-8"
          label="Submit Report"
          onPress={() => {
            void handleSubmit();
          }}
        />
      </View>
    </Screen>
  );
}
