import { PrivacySafetyInfoListScreen } from "@/modules/settings/components/PrivacySafetyInfoListScreen";
import { MANAGED_CIRCLE_ACCESS } from "@/modules/settings/privacySafetyContent";

export default function ManagedCircleAccessScreen() {
  return (
    <PrivacySafetyInfoListScreen
      cards={MANAGED_CIRCLE_ACCESS.cards}
      subtitle={MANAGED_CIRCLE_ACCESS.subtitle}
      title={MANAGED_CIRCLE_ACCESS.title}
    />
  );
}
