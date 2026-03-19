/** Purpose: Expose safe accessors for Firebase native modules and emulator wiring. */
import firebase from "@react-native-firebase/app";
import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";
import functions from "@react-native-firebase/functions";
import messaging from "@react-native-firebase/messaging";

let emulatorsConnected = false;

export const hasFirebaseApp = () => {
  try {
    firebase.app();
    return true;
  } catch {
    return false;
  }
};

export const firebaseAuth = () => auth();
export const firebaseFirestore = () => firestore();
export const firebaseFunctions = () => functions();
export const firebaseMessaging = () => messaging();

export const connectFirebaseEmulators = () => {
  if (!__DEV__ || emulatorsConnected || !hasFirebaseApp()) {
    return;
  }

  try {
    auth().useEmulator("http://127.0.0.1:9099");
    firestore().useEmulator("127.0.0.1", 8080);
    functions().useEmulator("127.0.0.1", 5001);
    emulatorsConnected = true;
  } catch {
    // Ignore emulator setup failures when native config is incomplete.
  }
};
