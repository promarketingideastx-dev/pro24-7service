'use client';

import { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { useTranslations } from 'next-intl';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
const TOKEN_TTL_DAYS = 7;

/**
 * NotificationBanner — shows a tap-to-enable banner for push notifications.
 *
 * On iOS, Notification.requestPermission() MUST be called from a direct
 * user gesture (button tap). Calling it from setTimeout/useEffect silently
 * fails even in standalone PWA mode. This component is the correct solution.
 */
export default function NotificationBanner() {
    const { user } = useAuth();
    const [visible, setVisible] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!user) return;
        if (!VAPID_PUBLIC_KEY) return;
        if (!('Notification' in window) || !('serviceWorker' in navigator)) return;

        // Already granted or denied — don't show banner
        if (Notification.permission !== 'default') return;

        // Check if token is already fresh
        const checkFresh = async () => {
            try {
                const snap = await getDoc(doc(db, 'users', user.uid));
                const updatedAt = snap.data()?.pushTokenUpdatedAt as string | undefined;
                if (updatedAt) {
                    const ageMs = Date.now() - new Date(updatedAt).getTime();
                    if (ageMs < TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000) return; // fresh — hide
                }
            } catch { /* ignore */ }

            // Show banner after 1.5 s so it doesn't compete with cookie banner
            setTimeout(() => setVisible(true), 1500);
        };

        checkFresh();
    }, [user?.uid]);

    // Don't render for non-PWA iOS or if not needed
    if (!visible) return null;

    const handleEnable = async () => {
        setLoading(true);
        try {
            // ⚡ This MUST be called synchronously inside a click handler on iOS
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                setVisible(false);
                return;
            }

            const swReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
            await navigator.serviceWorker.ready;

            const isIOS =
                /iP(hone|ad|od)/.test(navigator.userAgent) ||
                (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

            if (isIOS) {
                await subscribeWithPushManager(swReg);
            } else {
                await subscribeWithFCM(swReg);
            }

            setVisible(false);
        } catch (err) {
            console.warn('[NotificationBanner] Error:', err);
            setVisible(false);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed bottom-20 left-4 right-4 z-50 bg-slate-900 border border-teal-500/30 rounded-2xl shadow-2xl p-4 flex items-start gap-3 animate-slide-up">
            <div className="w-9 h-9 rounded-full bg-teal-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <Bell className="w-4 h-4 text-teal-400" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-semibold">Activa las notificaciones</p>
                <p className="text-slate-400 text-xs mt-0.5">Recibe alertas de citas y mensajes en tiempo real.</p>
                <button
                    onClick={handleEnable}
                    disabled={loading}
                    className="mt-2 px-3 py-1.5 bg-teal-500 hover:bg-teal-400 text-white text-xs font-semibold rounded-full transition-colors disabled:opacity-60"
                >
                    {loading ? 'Activando...' : 'Activar ahora'}
                </button>
            </div>
            <button
                onClick={() => setVisible(false)}
                className="text-slate-500 hover:text-slate-300 transition-colors shrink-0"
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    );
}

// ── iOS: PushManager subscription ─────────────────────────────────────────────
async function subscribeWithPushManager(swReg: ServiceWorkerRegistration) {
    if (!VAPID_PUBLIC_KEY) return;
    if (!('PushManager' in window)) return;

    let subscription = await swReg.pushManager.getSubscription();
    if (!subscription) {
        const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
        subscription = await swReg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: applicationServerKey.buffer as ArrayBuffer,
        });
    }

    const { auth, db } = await import('@/lib/firebase');
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    await setDoc(
        doc(db, 'users', uid),
        {
            pushSubscription: JSON.stringify(subscription.toJSON()),
            pushTokenUpdatedAt: new Date().toISOString(),
            fcmToken: null,
        },
        { merge: true }
    );
    console.info('[Push] iOS subscription registered ✓');
}

// ── Android/Chrome: FCM token ─────────────────────────────────────────────────
async function subscribeWithFCM(swReg: ServiceWorkerRegistration) {
    if (!VAPID_PUBLIC_KEY) return;
    const { getFirebaseMessaging, auth, db } = await import('@/lib/firebase');
    const messaging = await getFirebaseMessaging();
    if (!messaging) return;

    const { getToken } = await import('firebase/messaging');
    const token = await getToken(messaging, {
        vapidKey: VAPID_PUBLIC_KEY,
        serviceWorkerRegistration: swReg,
    });
    if (!token) return;

    const uid = auth.currentUser?.uid;
    if (!uid) return;

    await setDoc(
        doc(db, 'users', uid),
        {
            fcmToken: token,
            pushTokenUpdatedAt: new Date().toISOString(),
            pushSubscription: null,
        },
        { merge: true }
    );
    console.info('[Push] FCM token registered ✓');
}

// ── Utility ───────────────────────────────────────────────────────────────────
function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    return Uint8Array.from(Array.from(rawData).map((c) => c.charCodeAt(0)));
}
