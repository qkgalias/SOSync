import { PrivacySafetyInfoListScreen } from "@/modules/settings/components/PrivacySafetyInfoListScreen";
import { DATA_SECURITY_OVERVIEW } from "@/modules/settings/privacySafetyContent";

export default function DataSecurityOverviewScreen() {
  return (
    <PrivacySafetyInfoListScreen
      cards={DATA_SECURITY_OVERVIEW.cards}
      subtitle={DATA_SECURITY_OVERVIEW.subtitle}
      title={DATA_SECURITY_OVERVIEW.title}
    />
  );
}
