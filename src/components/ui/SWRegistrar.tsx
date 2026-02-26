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
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker
                .register('/sw.js', { scope: '/' })
                .then((reg) => {
                    console.log('[SW] Registered:', reg.scope);
                })
                .catch((err) => {
                    // Non-critical — app works without SW
                    console.warn('[SW] Registration failed:', err);
                });
        }
    }, []);

    return null;
}
