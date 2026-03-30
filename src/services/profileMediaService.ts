/** Purpose: Pick and upload avatar images to Firebase Storage for trusted-circle identity. */
import * as ImagePicker from "expo-image-picker";

import { resolveActiveFirebaseClientMode } from "@/config/backendRuntime";
import { hasFirebaseApp, firebaseStorage } from "@/services/firebase";

const getClientMode = () => resolveActiveFirebaseClientMode(hasFirebaseApp());

export const profileMediaService = {
  async pickImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      throw new Error("Photo library permission is required to choose a profile photo.");
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.7,
      aspect: [1, 1],
    });

    if (result.canceled || !result.assets[0]?.uri) {
      return null;
    }

    return result.assets[0];
  },

  async uploadProfilePhoto(userId: string, localUri: string) {
    if (getClientMode() === "demo") {
      return localUri;
    }

    const reference = firebaseStorage().ref(`avatars/${userId}/${Date.now()}.jpg`);
    await reference.putFile(localUri, {
      contentType: "image/jpeg",
      customMetadata: {
        owner: userId,
      },
    });

    try {
      return await reference.getDownloadURL();
    } catch (error) {
      const code =
        typeof error === "object" && error && "code" in error && typeof error.code === "string"
          ? error.code
          : "";

      if (code === "storage/object-not-found") {
        throw new Error(
          "Firebase Storage is not ready for this project yet. Open Firebase Console -> Storage and create the default bucket, then try uploading the profile photo again.",
        );
      }

      throw error;
    }
  },
};
