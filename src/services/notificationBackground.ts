/** Purpose: Register a background FCM handler before the Expo Router tree loads. */
import { getMessaging, setBackgroundMessageHandler } from "@react-native-firebase/messaging";

import { hasFirebaseApp } from "@/services/firebase";

if (hasFirebaseApp()) {
  setBackgroundMessageHandler(getMessaging(), async () => undefined);
}
