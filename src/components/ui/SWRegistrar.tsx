'use client';

import { useEffect } from 'react';

/**
 * SWRegistrar — Registers the general-purpose PWA Service Worker (/sw.js).
 * Renders nothing. Include once in the locale layout inside Providers.
 *
 * Note: The FCM SW (/firebase-messaging-sw.js) is registered separately
 * by useFCMToken after the user grants notification permission.
 */
export default function SWRegistrar() {
    useEffect(() => {
        console.info('[SWRegistrar] Version 2.0.1 - Forcing Global Cache Purge');
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then((registrations) => {
                for (const registration of registrations) {
                    // Mantiene el de notificaciones Firebase, elimina el de caché PWA viejo
                    if (!registration.active?.scriptURL.includes('firebase-messaging-sw.js')) {
                        registration.unregister()
                            .then(success => console.warn('[SW Purge] Unregistered PWA Cache Worker:', success))
                            .catch(err => console.error('[SW Purge] Failed unregister', err));
                    }
                }
            });
            // Purga extrema de caché (Caches API Storage)
            if ('caches' in window) {
                caches.keys().then((names) => {
                    for (const name of names) {
                        caches.delete(name);
                    }
                });
            }
        }
    }, []);

    return null;
}
