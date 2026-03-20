/** Purpose: Provide trusted circle state and actions to group-aware screens. */
import { useAuthSession } from "@/hooks/useAuthSession";

export const useGroups = () => {
  const { createCircle, createInvite, groups, selectedGroupId, setSelectedGroupId } = useAuthSession();

  return {
    groups,
    selectedGroupId,
    setSelectedGroupId,
    createCircle,
    createInvite,
  };
};
