// PRO24/7YA — Firebase Messaging + Native Web Push Service Worker
// This file must be at /public/firebase-messaging-sw.js (served from root)
//
// Handles TWO push channels:
//   1. FCM (Firebase Cloud Messaging) — used on Android / Chrome / Edge
//   2. Native Web Push API (VAPID) — used on iOS 16.4+ PWA
//
// iOS Safari does NOT support the Firebase Messaging SDK.
// Instead it uses the standard 'push' event triggered by PushManager subscriptions.

// ── FCM setup (Android/Chrome/Edge only) ──────────────────────────────────────
try {
    importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
    importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

    firebase.initializeApp({
        apiKey: 'AIzaSyB5ZOlW9HiOya4g0nKPHW202CRUzTlf4fo',
        authDomain: 'service-marketplace-mvp-28884.firebaseapp.com',
        projectId: 'service-marketplace-mvp-28884',
        storageBucket: 'service-marketplace-mvp-28884.firebasestorage.app',
        messagingSenderId: '914462693945',
        appId: '1:914462693945:web:b42780cf59888217070be8',
    });

    const messaging = firebase.messaging();

    // Handle background FCM messages (app closed or backgrounded on Android/Chrome)
    messaging.onBackgroundMessage((payload) => {
        const { title, body, icon } = payload.notification ?? {};
        self.registration.showNotification(title ?? 'PRO24/7', {
            body: body ?? '',
            icon: icon ?? '/icon-192.png',
            badge: '/icon-192.png',
            data: payload.data ?? {},
            vibrate: [200, 100, 200],
        });
    });
} catch (e) {
    // iOS does not support importScripts for Firebase — silently skip
    console.info('[SW] FCM SDK not loaded (expected on iOS):', e.message);
}

// ── Native Web Push handler (iOS 16.4+ PWA & any browser using PushManager) ──
// This fires when a push message is received via the standard Web Push protocol.
// On iOS this is the ONLY way to receive push notifications.
self.addEventListener('push', (event) => {
    if (!event.data) return;

    let payload;
    try {
        payload = event.data.json();
    } catch {
        payload = { title: 'PRO24/7', body: event.data.text() };
    }

    const title = payload.title ?? 'PRO24/7';
    const body = payload.body ?? '';
    const icon = payload.icon ?? '/icon-192.png';
    const url = payload.url ?? '/';

    event.waitUntil(
        self.registration.showNotification(title, {
            body,
            icon,
            badge: '/icon-192.png',
            data: { url },
            vibrate: [200, 100, 200],
        })
    );
});

// ── Notification click — open or focus the app ────────────────────────────────
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const targetUrl = event.notification.data?.url ?? '/';
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            for (const client of clientList) {
                if (client.url.includes(targetUrl) && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});
