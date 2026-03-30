/** Purpose: Render the profile avatar selection control and surface upload progress. */
import { ActivityIndicator, Image, Pressable, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { cn, toInitials } from "@/utils/helpers";

type AvatarPickerProps = {
  name: string;
  photoURL?: string | null;
  loading?: boolean;
  onPress: () => void;
  className?: string;
};

export const AvatarPicker = ({ className, loading, name, onPress, photoURL }: AvatarPickerProps) => (
  <Pressable className={cn("items-center justify-center", className)} onPress={onPress}>
    <View className="h-40 w-40 items-center justify-center rounded-full bg-panel">
      {photoURL ? (
        <Image className="h-40 w-40 rounded-full" resizeMode="cover" source={{ uri: photoURL }} />
      ) : (
        <Text className="text-[42px] font-semibold text-muted">{toInitials(name || "SOSync")}</Text>
      )}
    </View>
    <View className="-mt-10 ml-24 h-12 w-12 items-center justify-center rounded-full border-2 border-accent bg-white">
      {loading ? <ActivityIndicator color="#7B2C28" /> : <MaterialCommunityIcons color="#7B2C28" name="plus" size={28} />}
    </View>
  </Pressable>
);
