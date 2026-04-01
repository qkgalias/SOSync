/** Purpose: Keep the signed-in profile/settings stack on one consistent Home-red visual standard. */
export const PROFILE_ACCENT = "#5C1515";

export const getCircleRoleLabel = (isOwner: boolean, role?: "admin" | "member") => {
  if (isOwner) {
    return "Owner";
  }

  return role === "admin" ? "Admin" : "Member";
};

export const getCircleRoleSummary = (roleLabel: string) => {
  switch (roleLabel) {
    case "Owner":
      return "Can manage roles, share the circle code, transfer ownership, and remove non-owner members.";
    case "Admin":
      return "Can share the circle code and remove ordinary members from the circle.";
    default:
      return "Can stay informed, respond to alerts, and leave the circle when needed.";
  }
};
