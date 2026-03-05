import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getFirestore, enableMultiTabIndexedDbPersistence } from "firebase/firestore";
import { getMessaging, isSupported } from "firebase/messaging";

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

import { Capacitor } from '@capacitor/core';
import { initializeAuth, browserLocalPersistence } from 'firebase/auth';

console.log('[FIREBASE] initializeApp started');
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
console.log('[FIREBASE] getAuth started');

export const auth = (() => {
    if (typeof window === 'undefined') {
        return getAuth(app);
    }
    if (Capacitor.isNativePlatform()) {
        console.log('[FIREBASE] Initializing auth with browserLocalPersistence to prevent iOS IndexedDB hang');
        return initializeAuth(app, {
            persistence: browserLocalPersistence
        });
    } else {
        return getAuth(app);
    }
})();

console.log('[FIREBASE] getStorage started');
export const storage = getStorage(app);
console.log('[FIREBASE] getFirestore started');
export const db = getFirestore(app);
console.log('[FIREBASE] init complete! Auth, Storage, DB ready.');

// Temporarily disabled multi-tab persistence to fix iOS Simulator infinite hanging
// on Firestore init.
// if (typeof window !== 'undefined') { ... }

export default app;

// Lazy-init messaging (browser-only, async because isSupported() is async)
export async function getFirebaseMessaging() {
    if (typeof window === 'undefined') return null;
    const supported = await isSupported();
    if (!supported) return null;
    return getMessaging(app);
}
