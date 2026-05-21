/** Purpose: Initialize shared Firebase Admin clients once for every backend function. */
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";
import { getStorage } from "firebase-admin/storage";

initializeApp();

export const adminAuth = getAuth();
export const adminDb = getFirestore();
export const adminMessaging = getMessaging();
export const adminStorage = getStorage();
