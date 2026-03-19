/** Purpose: Register a background FCM handler before the Expo Router tree loads. */
import { firebaseMessaging, hasFirebaseApp } from "@/services/firebase";

if (hasFirebaseApp()) {
  firebaseMessaging().setBackgroundMessageHandler(async () => undefined);
}
