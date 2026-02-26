// PRO24/7YA — General Purpose PWA Service Worker
// Handles: offline cache, app shell, static assets
// FCM push messages are handled by /firebase-messaging-sw.js (separate SW)

const CACHE_VERSION = 'pro247ya-v1';
const ASSETS_TO_CACHE = [
    '/',
    '/es',
    '/manifest.json',
    '/favicon.png',
    '/icon-192.png',
    '/icon-512.png',
    '/sounds/notification.mp3',
];

// ── Install: pre-cache the app shell ─────────────────────────────────────────
self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_VERSION).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE).catch(() => {
                // If any asset fails (e.g. offline), continue anyway
            });
        })
    );
});

// ── Activate: remove old caches ───────────────────────────────────────────────
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys
                    .filter((key) => key !== CACHE_VERSION)
                    .map((key) => caches.delete(key))
            )
        ).then(() => self.clients.claim())
    );
});

// ── Fetch: network-first for API/pages, cache-first for static assets ─────────
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET, cross-origin (except Firebase), and chrome-extension
    if (
        request.method !== 'GET' ||
        (!url.origin.includes(self.location.hostname) &&
            !url.hostname.includes('firebaseapp.com') &&
            !url.hostname.includes('firebasestorage.googleapis.com'))
    ) {
        return;
    }

    // Skip API routes and Firebase calls — always network
    if (
        url.pathname.startsWith('/api/') ||
        url.hostname.includes('firebase') ||
        url.hostname.includes('googleapis') ||
        url.hostname.includes('openstreetmap') ||
        url.hostname.includes('cartocdn')
    ) {
        return;
    }

    // Static assets (images, fonts, icons) — cache-first
    if (
        url.pathname.match(/\.(png|jpg|jpeg|webp|svg|gif|ico|woff|woff2|ttf|mp3|wav)$/)
    ) {
        event.respondWith(
            caches.match(request).then((cached) => {
                if (cached) return cached;
                return fetch(request).then((response) => {
                    if (response && response.status === 200) {
                        const clone = response.clone();
                        caches.open(CACHE_VERSION).then((cache) => cache.put(request, clone));
                    }
                    return response;
                });
            })
        );
        return;
    }

    // Pages — network-first, fallback to cache, then offline page
    event.respondWith(
        fetch(request)
            .then((response) => {
                if (response && response.status === 200) {
                    const clone = response.clone();
                    caches.open(CACHE_VERSION).then((cache) => cache.put(request, clone));
                }
                return response;
            })
            .catch(() => {
                return caches.match(request)
                    .then((cached) => cached || caches.match('/'));
            })
    );
});
