import { Modal, Text, View } from "react-native";

import { Button } from "@/components/Button";

type HelpSubmissionSuccessModalProps = {
  bodyPrefix: string;
  onClose: () => void;
  referenceId: string | null;
  title: string;
};

export function HelpSubmissionSuccessModal({
  bodyPrefix,
  onClose,
  referenceId,
  title,
}: HelpSubmissionSuccessModalProps) {
  return (
    <Modal animationType="fade" transparent visible={Boolean(referenceId)} onRequestClose={onClose}>
      <View className="flex-1 justify-center bg-black/45 px-6">
        <View className="rounded-[24px] bg-page p-5">
          <Text className="text-[22px] font-bold text-ink">{title}</Text>
          <Text className="mt-3 text-[15px] leading-6 text-muted">
            {bodyPrefix} <Text className="font-semibold text-ink">{referenceId}</Text>.
          </Text>
          <Button className="mt-6 self-center rounded-full px-8" label="OK" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}
