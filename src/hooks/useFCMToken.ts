'use client';

import { useEffect } from 'react';
import { getToken } from 'firebase/messaging';
import { doc, setDoc } from 'firebase/firestore';
import { db, getFirebaseMessaging } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

/**
 * useFCMToken — registers the browser for push notifications.
 * - Requests notification permission (once, silently skips if denied)
 * - Gets the FCM device token
 * - Stores it in Firestore: users/{uid}/fcmToken
 *
 * Usage: call this hook inside any component that renders after the user logs in.
 */
export function useFCMToken() {
    const { user } = useAuth();

    useEffect(() => {
        if (!user) return;
        if (!VAPID_KEY) {
            console.warn('[FCM] NEXT_PUBLIC_FIREBASE_VAPID_KEY is not set — push skipped');
            return;
        }

        const register = async () => {
            try {
                // 1. Request notification permission
                const permission = await Notification.requestPermission();
                if (permission !== 'granted') return;

                // 2. Register the service worker first
                let swReg: ServiceWorkerRegistration | undefined;
                if ('serviceWorker' in navigator) {
                    swReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
                }

                // 3. Get messaging instance (browser + supported check)
                const messaging = await getFirebaseMessaging();
                if (!messaging) return;

                // 4. Get FCM token
                const token = await getToken(messaging, {
                    vapidKey: VAPID_KEY,
                    serviceWorkerRegistration: swReg,
                });

                if (!token) return;

                // 5. Save token to Firestore for this user
                await setDoc(
                    doc(db, 'users', user.uid),
                    { fcmToken: token, fcmTokenUpdatedAt: new Date().toISOString() },
                    { merge: true }
                );
            } catch (err) {
                // Silent — push is non-critical
                console.warn('[FCM] Token registration failed:', err);
            }
        };

        register();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.uid]);
}
