/** Purpose: Render the SOSync mark and wordmark across splash and onboarding flows. */
import { Image, Text, View } from "react-native";

import { cn } from "@/utils/helpers";

type BrandLogoProps = {
  size?: "sm" | "md" | "lg";
  centered?: boolean;
};

const sizeClasses = {
  sm: {
    gap: 8,
    image: 42,
    sosSize: 18,
    syncOffset: 2,
    syncSize: 15,
  },
  md: {
    gap: 10,
    image: 56,
    sosSize: 24,
    syncOffset: 3,
    syncSize: 20,
  },
  lg: {
    gap: 12,
    image: 72,
    sosSize: 31,
    syncOffset: 4,
    syncSize: 26,
  },
} as const;

const brandMarkSource = require("../../assets/branding/brand-mark.png");

export const BrandLogo = ({ centered = false, size = "md" }: BrandLogoProps) => {
  const token = sizeClasses[size];

  return (
    <View className={cn("flex-row items-center", centered ? "justify-center" : "")} style={{ gap: token.gap }}>
      <Image
        accessibilityIgnoresInvertColors
        resizeMode="contain"
        source={brandMarkSource}
        style={{ height: token.image, width: token.image }}
      />
      <View className="flex-row items-start">
        <Text
          className="font-semibold text-[#5C1515]"
          style={{ fontSize: token.sosSize, letterSpacing: -0.8, lineHeight: token.sosSize + 2 }}
        >
          SoS
        </Text>
        <Text
          className="font-semibold text-black"
          style={{
            fontSize: token.syncSize,
            letterSpacing: -0.6,
            lineHeight: token.syncSize + 2,
            marginLeft: -1,
            marginTop: token.syncOffset,
          }}
        >
          ync
        </Text>
      </View>
    </View>
  );
};
