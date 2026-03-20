/** Purpose: Provide FAQs and support guidance for disaster readiness. */
import { Text } from "react-native";

import { InfoCard } from "@/components/InfoCard";
import { Screen } from "@/components/Screen";

export default function HelpScreen() {
  return (
    <Screen title="Help and about" subtitle="Quick answers for setup, privacy, and emergency usage.">
      <InfoCard title="How private is location sharing?" eyebrow="FAQ">
        <Text className="text-sm leading-6 text-muted">
          SOSync only shares location inside trusted circles, and this foundation keeps location updates disabled until
          the user explicitly grants permission and turns sharing on in-app.
        </Text>
      </InfoCard>
      <InfoCard title="What if I lose signal?" eyebrow="FAQ">
        <Text className="text-sm leading-6 text-muted">
          The first foundation stores the latest known map state locally and queues outbound SOS writes when a live
          backend is connected again.
        </Text>
      </InfoCard>
      <InfoCard title="Need support?" eyebrow="Contact">
        <Text className="text-sm leading-6 text-muted">
          Reach the operations team at support@sosync.app or use your region’s official disaster response channels for
          urgent assistance.
        </Text>
      </InfoCard>
    </Screen>
  );
}
