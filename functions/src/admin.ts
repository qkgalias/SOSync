/** Purpose: Initialize shared Firebase Admin clients once for every backend function. */
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";

initializeApp();

export const adminDb = getFirestore();
export const adminMessaging = getMessaging();
