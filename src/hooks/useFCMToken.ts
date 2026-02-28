'use client';

import { useEffect } from 'react';
import { getToken } from 'firebase/messaging';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db, getFirebaseMessaging } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
// Re-register push token at most once every 7 days to avoid unnecessary prompts
const TOKEN_TTL_DAYS = 7;

/**
 * useFCMToken — registers the browser for push notifications.
 *
 * Strategy:
 *   • Android / Chrome / Edge: use Firebase Cloud Messaging (FCM token)
 *   • iOS 16.4+ PWA (added to Home Screen): use native PushManager + VAPID
 *     — Firebase isSupported() returns false on iOS, so we use PushManager directly
 *     — the push subscription JSON is stored in Firestore as `pushSubscription`
 *
 * The backend (push-client API) detects which channel to use based on which
 * field is present in the user's Firestore doc: `fcmToken` vs `pushSubscription`.
 */
export function useFCMToken() {
    const { user } = useAuth();

    useEffect(() => {
        if (!user) return;
        if (!VAPID_PUBLIC_KEY) {
            console.warn('[Push] NEXT_PUBLIC_FIREBASE_VAPID_KEY is not set — push skipped');
            return;
        }
        if (!('Notification' in window) || !('serviceWorker' in navigator)) return;
        if (Notification.permission === 'denied') return;

        const isIOS =
            /iP(hone|ad|od)/.test(navigator.userAgent) ||
            (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

        const isStandalone =
            window.matchMedia('(display-mode: standalone)').matches ||
            (navigator as any).standalone === true;

        if (isIOS && !isStandalone) {
            // Running in plain Safari — push requires adding to Home Screen first
            console.info('[Push] iOS Safari (non-PWA): push not available until added to Home Screen.');
            return;
        }

        const register = async () => {
            try {
                // 2-second delay — reduces "too early" automatic denial on iOS
                await new Promise((r) => setTimeout(r, 2000));

                // Check if token is still fresh — skip re-registration if recent
                if (Notification.permission === 'granted') {
                    try {
                        const snap = await getDoc(doc(db, 'users', user.uid));
                        const updatedAt = snap.data()?.pushTokenUpdatedAt as string | undefined;
                        if (updatedAt) {
                            const ageMs = Date.now() - new Date(updatedAt).getTime();
                            if (ageMs < TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000) {
                                console.info('[Push] Token is fresh — skipping re-registration');
                                return;
                            }
                        }
                    } catch { /* ignore — continue */ }
                }

                // Ask for permission
                const permission = await Notification.requestPermission();
                if (permission !== 'granted') {
                    console.info('[Push] Permission not granted');
                    return;
                }

                // Register the unified service worker
                const swReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
                await navigator.serviceWorker.ready;

                if (isIOS) {
                    // ── iOS path: use native PushManager ─────────────────────
                    await registerWithPushManager(swReg, user.uid);
                } else {
                    // ── Android/Chrome path: use FCM ──────────────────────────
                    await registerWithFCM(swReg, user.uid);
                }
            } catch (err) {
                console.warn('[Push] Registration failed:', err);
            }
        };

        register();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.uid]);
}

// ── iOS: Native Web Push via PushManager ──────────────────────────────────────
async function registerWithPushManager(
    swReg: ServiceWorkerRegistration,
    uid: string
) {
    if (!VAPID_PUBLIC_KEY) return;
    if (!('PushManager' in window)) {
        console.warn('[Push] PushManager not supported');
        return;
    }

    // Convert VAPID public key from base64url to Uint8Array
    const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);

    // Check if already subscribed
    let subscription = await swReg.pushManager.getSubscription();

    if (!subscription) {
        subscription = await swReg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: applicationServerKey.buffer as ArrayBuffer,
        });
    }

    // Store the push subscription JSON in Firestore
    await setDoc(
        doc(db, 'users', uid),
        {
            pushSubscription: JSON.stringify(subscription.toJSON()),
            pushTokenUpdatedAt: new Date().toISOString(),
            // Clear any stale FCM token
            fcmToken: null,
        },
        { merge: true }
    );

    console.info('[Push] iOS Web Push subscription registered ✓');
}

// ── Android/Chrome: FCM token ─────────────────────────────────────────────────
async function registerWithFCM(
    swReg: ServiceWorkerRegistration,
    uid: string
) {
    if (!VAPID_PUBLIC_KEY) return;
    const { getFirebaseMessaging } = await import('@/lib/firebase');
    const messaging = await getFirebaseMessaging();
    if (!messaging) {
        console.warn('[Push] FCM messaging not supported on this browser');
        return;
    }

    const { getToken } = await import('firebase/messaging');
    const token = await getToken(messaging, {
        vapidKey: VAPID_PUBLIC_KEY,
        serviceWorkerRegistration: swReg,
    });

    if (!token) return;

    await setDoc(
        doc(db, 'users', uid),
        {
            fcmToken: token,
            pushTokenUpdatedAt: new Date().toISOString(),
            // Clear any stale iOS subscription
            pushSubscription: null,
        },
        { merge: true }
    );

    console.info('[Push] FCM token registered ✓');
}

// ── Utility: convert base64url string to Uint8Array ──────────────────────────
function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    return Uint8Array.from(Array.from(rawData).map((char) => char.charCodeAt(0)));
}
