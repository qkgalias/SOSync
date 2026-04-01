/** Purpose: Render the Home-only dock navigation inside the expandable map sheet. */
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, View } from "react-native";

import type { HomeMapAppearance } from "@/types";

type HomeDockNavProps = {
  activeRoute: "home" | "hotlines" | "notifications" | "profile";
  appearance: HomeMapAppearance;
  onSelect: (route: "home" | "hotlines" | "notifications" | "profile") => void;
};

const iconByRoute: Record<HomeDockNavProps["activeRoute"], keyof typeof MaterialCommunityIcons.glyphMap> = {
  home: "home-outline",
  hotlines: "phone-outline",
  notifications: "bell-outline",
  profile: "account-outline",
};

export const HomeDockNav = ({ activeRoute, appearance, onSelect }: HomeDockNavProps) => {
  const palette =
    appearance === "dark"
      ? {
          dock: "#6C1F1D",
          icon: "rgba(255, 255, 255, 0.76)",
          selected: "#FFFFFF",
        }
      : {
          dock: "#7B1F1E",
          icon: "rgba(255, 255, 255, 0.78)",
          selected: "#FFFFFF",
        };

  return (
    <View
      className="mx-auto mt-8 flex-row items-center rounded-full px-8 py-4"
      style={{ backgroundColor: palette.dock }}
    >
      {(["home", "hotlines", "notifications", "profile"] as const).map((route) => (
        <Pressable
          key={route}
          accessibilityLabel={route}
          className="mx-4"
          onPress={() => onSelect(route)}
        >
          <MaterialCommunityIcons
            color={activeRoute === route ? palette.selected : palette.icon}
            name={iconByRoute[route]}
            size={30}
          />
        </Pressable>
      ))}
    </View>
  );
};
