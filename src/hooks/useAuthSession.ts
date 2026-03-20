/** Purpose: Expose the root session context through a stable app hook. */
import { useSessionContext } from "@/providers/SessionProvider";

export const useAuthSession = () => useSessionContext();
