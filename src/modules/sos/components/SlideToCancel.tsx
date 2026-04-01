/** Purpose: Provide a left-to-right slider that cancels an armed SOS countdown. */
import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, PanResponder, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

const TRACK_PADDING = 6;
const KNOB_SIZE = 52;

type SlideToCancelProps = {
  active: boolean;
  disabled?: boolean;
  label?: string;
  onComplete: () => void;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const SlideToCancel = ({
  active,
  disabled = false,
  label = "Slide to cancel",
  onComplete,
}: SlideToCancelProps) => {
  const translateX = useRef(new Animated.Value(0)).current;
  const dragStart = useRef(0);
  const [trackWidth, setTrackWidth] = useState(0);
  const maxOffset = Math.max(trackWidth - KNOB_SIZE - TRACK_PADDING * 2, 0);
  const completionThreshold = maxOffset * 0.84;

  useEffect(() => {
    if (!active) {
      translateX.setValue(0);
    }
  }, [active, translateX]);

  const resetHandle = () => {
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 0,
      speed: 20,
    }).start();
  };

  const finishSlide = () => {
    Animated.timing(translateX, {
      toValue: maxOffset,
      duration: 120,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished) {
        return;
      }

      onComplete();
      translateX.setValue(0);
    });
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => active && !disabled,
        onMoveShouldSetPanResponder: (_, gesture) => active && !disabled && Math.abs(gesture.dx) > 2,
        onPanResponderGrant: () => {
          translateX.stopAnimation((value) => {
            dragStart.current = value;
          });
        },
        onPanResponderMove: (_, gesture) => {
          const nextValue = clamp(dragStart.current + gesture.dx, 0, maxOffset);
          translateX.setValue(nextValue);
        },
        onPanResponderRelease: () => {
          translateX.stopAnimation((value) => {
            if (value >= completionThreshold) {
              finishSlide();
              return;
            }

            resetHandle();
          });
        },
        onPanResponderTerminate: resetHandle,
      }),
    [active, completionThreshold, disabled, maxOffset, translateX],
  );

  return (
    <View
      className="mt-8 h-[64px] justify-center rounded-full border border-[#5B231F] bg-white/95 px-[6px]"
      onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
    >
      <Text className="text-center text-[17px] font-semibold text-accent">{label}</Text>
      <Animated.View
        {...panResponder.panHandlers}
        className="absolute left-[6px] top-[6px] h-[52px] w-[52px] items-center justify-center rounded-full bg-accent shadow-soft"
        style={{
          transform: [{ translateX }],
        }}
      >
        <MaterialCommunityIcons color="#FFFFFF" name="close" size={26} />
      </Animated.View>
    </View>
  );
};
