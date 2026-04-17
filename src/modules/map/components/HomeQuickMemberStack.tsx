/** Purpose: Render the responsive Home quick-member stack without coupling the animation logic to the screen file. */
import { useMemo } from "react";
import { Image, Pressable, Text } from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  type SharedValue,
} from "react-native-reanimated";

import type { HomeMapPalette } from "@/modules/map/homeMapTheme";
import type { HomeMapMarker } from "@/types";
import { toInitials } from "@/utils/helpers";

type HomeQuickMemberStackProps = {
  fadeEndIndex: number;
  fadeStartIndex: number;
  isSheetFullyExpanded: boolean;
  markers: HomeMapMarker[];
  onFocusMarker: (markerId: string) => void;
  palette: HomeMapPalette;
  selectedMarkerId: string | null;
  sheetAnimatedIndex: SharedValue<number>;
};

const getQuickMemberStackLayout = (count: number) => {
  if (count >= 6) {
    return { innerSize: 32, maxVisible: 6, offsetX: 3, outerSize: 38, verticalGap: 8 };
  }

  if (count >= 5) {
    return { innerSize: 34, maxVisible: 5, offsetX: 4, outerSize: 40, verticalGap: 9 };
  }

  if (count >= 4) {
    return { innerSize: 36, maxVisible: 4, offsetX: 5, outerSize: 42, verticalGap: 10 };
  }

  return { innerSize: 42, maxVisible: 4, offsetX: 8, outerSize: 50, verticalGap: 12 };
};

export const HomeQuickMemberStack = ({
  fadeEndIndex,
  fadeStartIndex,
  isSheetFullyExpanded,
  markers,
  onFocusMarker,
  palette,
  selectedMarkerId,
  sheetAnimatedIndex,
}: HomeQuickMemberStackProps) => {
  const layout = useMemo(() => getQuickMemberStackLayout(markers.length), [markers.length]);
  const animatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      sheetAnimatedIndex.value,
      [fadeStartIndex, fadeEndIndex],
      [1, 0],
      Extrapolation.CLAMP,
    );

    return { opacity };
  }, [fadeEndIndex, fadeStartIndex]);

  if (!markers.length) {
    return null;
  }

  return (
    <Animated.View
      className="absolute right-4 top-32 z-10"
      pointerEvents={isSheetFullyExpanded ? "none" : "auto"}
      style={animatedStyle}
    >
      {markers.slice(0, layout.maxVisible).map((marker, index) => {
        const selected = marker.markerId === selectedMarkerId;
        return (
          <Pressable
            key={marker.markerId}
            className="mb-3 items-center justify-center rounded-full border-2 shadow-soft"
            onPress={() => onFocusMarker(marker.markerId)}
            style={{
              backgroundColor: palette.chip,
              borderColor: selected ? palette.share : palette.page,
              height: layout.outerSize,
              marginBottom: layout.verticalGap,
              marginRight: index % 2 === 0 ? 0 : layout.offsetX,
              width: layout.outerSize,
            }}
          >
            {marker.photoURL ? (
              <Image
                className="rounded-full"
                resizeMode="cover"
                source={{ uri: marker.photoURL }}
                style={{
                  height: layout.innerSize,
                  width: layout.innerSize,
                }}
              />
            ) : (
              <Text className="font-semibold" style={{ color: palette.danger, fontSize: layout.innerSize >= 40 ? 12 : 11 }}>
                {toInitials(marker.displayName)}
              </Text>
            )}
          </Pressable>
        );
      })}
    </Animated.View>
  );
};
