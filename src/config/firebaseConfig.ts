/** Purpose: Define the Firebase project metadata used by the service layer and docs. */
import { env } from "@/config/env";

export const firebaseConfig = {
  projectId: env.firebaseProjectId,
  functionsRegion: env.functionsRegion,
};
