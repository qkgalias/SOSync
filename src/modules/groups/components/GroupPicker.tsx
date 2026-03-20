/** Purpose: Switch the active trusted circle without crowding the map screens. */
import { Pressable, ScrollView, Text } from "react-native";

import type { Group } from "@/types";
import { cn } from "@/utils/helpers";

type GroupPickerProps = {
  groups: Group[];
  selectedGroupId: string | null;
  onSelect: (groupId: string) => void;
};

export const GroupPicker = ({ groups, onSelect, selectedGroupId }: GroupPickerProps) => (
  <ScrollView className="mb-4" horizontal showsHorizontalScrollIndicator={false}>
    {groups.map((group) => {
      const selected = selectedGroupId === group.groupId;

      return (
        <Pressable
          key={group.groupId}
          className={cn(
            "mr-3 rounded-full border px-4 py-3",
            selected ? "border-primary bg-primary" : "border-line bg-surface",
          )}
          onPress={() => onSelect(group.groupId)}
        >
          <Text className={cn("font-semibold", selected ? "text-white" : "text-ink")}>{group.name}</Text>
        </Pressable>
      );
    })}
  </ScrollView>
);
