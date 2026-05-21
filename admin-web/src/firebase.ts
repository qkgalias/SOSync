import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { connectFunctionsEmulator, getFunctions, httpsCallable } from "firebase/functions";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? "sosync-3276e",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
};

export const functionsRegion = import.meta.env.VITE_FUNCTIONS_REGION ?? "asia-southeast1";

export const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const functions = getFunctions(firebaseApp, functionsRegion);

if (import.meta.env.VITE_USE_FUNCTIONS_EMULATOR === "true") {
  connectFunctionsEmulator(functions, import.meta.env.VITE_FUNCTIONS_EMULATOR_HOST ?? "127.0.0.1", 5001);
}

export const callAdminFunction = async <Input, Output>(name: string, input: Input): Promise<Output> => {
  const callable = httpsCallable<Input, Output>(functions, name);
  const result = await callable(input);
  return result.data;
};
