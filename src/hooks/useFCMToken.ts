'use client';

import { useEffect } from 'react';
import { getToken } from 'firebase/messaging';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db, getFirebaseMessaging } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
// Re-register FCM token at most once every 7 days
const TOKEN_TTL_DAYS = 7;

/**
 * useFCMToken — registers the browser for push notifications.
 * iOS compatibility notes:
 *   • Push requires iOS 16.4+ AND the app added to Home Screen (PWA mode)
 *   • On plain iOS Safari this hook exits silently — no error
 *   • A 3-second delay before prompting improves acceptance rate
 *   • Token is refreshed at most once every TOKEN_TTL_DAYS days
 */
export function useFCMToken() {
    const { user } = useAuth();

    useEffect(() => {
        if (!user) return;
        if (!VAPID_KEY) {
            console.warn('[FCM] NEXT_PUBLIC_FIREBASE_VAPID_KEY is not set — push skipped');
            return;
        }

        // iOS Safari (non-PWA) does NOT support FCM web push
        const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent);
        const isStandalone =
            window.matchMedia('(display-mode: standalone)').matches ||
            (navigator as any).standalone === true;

        if (isIOS && !isStandalone) {
            // Running in plain Safari — push not available until added to Home Screen
            console.info('[FCM] iOS Safari (non-PWA): notifications require adding app to Home Screen.');
            return;
        }

        if (!('Notification' in window) || !('serviceWorker' in navigator)) return;
        if (Notification.permission === 'denied') return;

        const register = async () => {
            try {
                // 3-second delay — avoids "too early" iOS permission denial
                await new Promise((r) => setTimeout(r, 3000));

                // Skip re-registration if token is fresh (< TOKEN_TTL_DAYS)
                if (Notification.permission === 'granted') {
                    try {
                        const snap = await getDoc(doc(db, 'users', user.uid));
                        const updatedAt = snap.data()?.fcmTokenUpdatedAt as string | undefined;
                        if (updatedAt) {
                            const ageMs = Date.now() - new Date(updatedAt).getTime();
                            if (ageMs < TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000) return;
                        }
                    } catch { /* ignore — continue to register */ }
                }

                // 1. Request notification permission
                const permission = await Notification.requestPermission();
                if (permission !== 'granted') return;

                // 2. Register the FCM service worker and wait for it to be ready
                const swReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
                await navigator.serviceWorker.ready;

                // 3. Get messaging instance
                const messaging = await getFirebaseMessaging();
                if (!messaging) return;

                // 4. Get FCM token
                const token = await getToken(messaging, {
                    vapidKey: VAPID_KEY,
                    serviceWorkerRegistration: swReg,
                });

                if (!token) return;

                // 5. Save token to Firestore
                await setDoc(
                    doc(db, 'users', user.uid),
                    { fcmToken: token, fcmTokenUpdatedAt: new Date().toISOString() },
                    { merge: true }
                );

                console.info('[FCM] Push token registered ✓');
            } catch (err) {
                console.warn('[FCM] Token registration failed:', err);
            }
        };

        register();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.uid]);
}
