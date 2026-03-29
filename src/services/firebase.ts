/** Purpose: Expose safe Firebase native accessors and connect emulators only when explicitly requested. */
import { getApp, getApps } from "@react-native-firebase/app";
import { connectAuthEmulator, getAuth } from "@react-native-firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "@react-native-firebase/firestore";
import { connectFunctionsEmulator, getFunctions } from "@react-native-firebase/functions";
import { getMessaging } from "@react-native-firebase/messaging";
import { getStorage } from "@react-native-firebase/storage";

import { backendRuntime } from "@/config/backendRuntime";
import { env } from "@/config/env";

let emulatorsConnected = false;

export const hasFirebaseApp = () => {
  try {
    return getApps().length > 0 && Boolean(getApp());
  } catch {
    return false;
  }
};

export const firebaseAuth = () => getAuth();
export const firebaseFirestore = () => getFirestore();
export const firebaseFunctions = () => getFunctions(undefined, env.functionsRegion);
export const firebaseMessaging = () => getMessaging();
export const firebaseStorage = () => getStorage();

export const connectFirebaseEmulators = () => {
  if (!__DEV__ || emulatorsConnected || !hasFirebaseApp() || !backendRuntime.useFirebaseEmulators) {
    return;
  }

  if (!backendRuntime.emulatorHost) {
    console.warn(
      "Firebase emulators are enabled, but no emulator host could be resolved. Set EXPO_PUBLIC_FIREBASE_EMULATOR_HOST when using a physical device.",
    );
    return;
  }

  try {
    connectAuthEmulator(firebaseAuth(), `http://${backendRuntime.emulatorHost}:9099`);
    connectFirestoreEmulator(firebaseFirestore(), backendRuntime.emulatorHost, 8080);
    connectFunctionsEmulator(firebaseFunctions(), backendRuntime.emulatorHost, 5001);
    emulatorsConnected = true;
  } catch (error) {
    console.warn("Firebase emulator connection failed.", error);
  }
};
