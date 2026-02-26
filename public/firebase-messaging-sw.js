// Firebase Messaging Service Worker
// This file must be at /public/firebase-messaging-sw.js so it is served from the root

importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// Firebase config — these values are public (NEXT_PUBLIC_*)
// They must be hardcoded here because service workers cannot access env variables
firebase.initializeApp({
    apiKey: 'AIzaSyB5ZOlW9HiOya4g0nKPHW202CRUzTlf4fo',
    authDomain: 'service-marketplace-mvp-28884.firebaseapp.com',
    projectId: 'service-marketplace-mvp-28884',
    storageBucket: 'service-marketplace-mvp-28884.firebasestorage.app',
    messagingSenderId: '914462693945',
    appId: '1:914462693945:web:b42780cf59888217070be8',
});

const messaging = firebase.messaging();

// Handle background messages (app is closed or in background)
messaging.onBackgroundMessage((payload) => {
    const { title, body, icon } = payload.notification ?? {};

    self.registration.showNotification(title ?? 'PRO24/7', {
        body: body ?? '',
        icon: icon ?? '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        data: payload.data ?? {},
        // Vibrate pattern for mobile
        vibrate: [200, 100, 200],
    });
});

// Handle notification click — open the app
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
