'use client';

import { useFCMToken } from '@/hooks/useFCMToken';

/**
 * FCMRegistrar — client component that registers the user for push notifications.
 * Renders nothing, just runs the useFCMToken hook.
 * Include once in the locale layout inside Providers.
 */
export default function FCMRegistrar() {
    useFCMToken();
    return null;
}
