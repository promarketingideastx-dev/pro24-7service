import { NextRequest, NextResponse } from 'next/server';

// Force Node.js runtime — required for firebase-admin and web-push (cannot run in Edge)
export const runtime = 'nodejs';

// ── Lazy-load firebase-admin ───────────────────────────────────────────────────
async function getAdminSDK() {
    const { getApps, initializeApp, cert } = await import('firebase-admin/app');
    const { getFirestore } = await import('firebase-admin/firestore');
    const { getMessaging } = await import('firebase-admin/messaging');

    if (!getApps().length) {
        let credential;
        if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
            const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
            credential = cert(serviceAccount);
        } else {
            try {
                // eslint-disable-next-line @typescript-eslint/no-require-imports
                const serviceAccount = require('../../../../../serviceAccountKey.json');
                credential = cert(serviceAccount);
            } catch {
                return null;
            }
        }
        initializeApp({ credential });
    }

    return { db: getFirestore(), messaging: getMessaging() };
}

// ── Route handler ──────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
    try {
        const sdk = await getAdminSDK();
        if (!sdk) {
            console.warn('[push-client] Firebase Admin not initialized — push skipped');
            return NextResponse.json({ ok: true, skipped: true });
        }

        const { customerUid, title, body, url } = await req.json() as {
            customerUid?: string;
            title: string;
            body: string;
            url?: string;
        };

        if (!customerUid) {
            return NextResponse.json({ ok: true, skipped: true, reason: 'no_uid' });
        }

        // 1. Fetch user doc from Firestore
        const userDoc = await sdk.db.collection('users').doc(customerUid).get();
        const userData = userDoc.data();

        const fcmToken = userData?.fcmToken as string | undefined;
        const pushSubscriptionRaw = userData?.pushSubscription as string | undefined;

        // 2a. Send via FCM (Android/Chrome/Edge)
        if (fcmToken) {
            try {
                await sdk.messaging.send({
                    token: fcmToken,
                    notification: { title, body },
                    webpush: {
                        notification: {
                            icon: '/icon-192.png',
                            badge: '/icon-192.png',
                            vibrate: [200, 100, 200],
                        },
                        fcmOptions: { link: url ?? '/' },
                    },
                    data: { url: url ?? '/' },
                });
                console.info('[push-client] FCM push sent to', customerUid);
                return NextResponse.json({ ok: true, channel: 'fcm' });
            } catch (fcmErr: any) {
                console.warn('[push-client] FCM failed:', fcmErr.message);
                // Fall through — try web-push if we have a subscription
            }
        }

        // 2b. Send via native Web Push (iOS PWA)
        if (pushSubscriptionRaw) {
            const vapidPublicKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
            const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

            if (!vapidPublicKey || !vapidPrivateKey) {
                console.warn('[push-client] VAPID keys not configured — iOS push skipped');
                return NextResponse.json({ ok: true, skipped: true, reason: 'no_vapid_keys' });
            }

            const webpush = (await import('web-push')).default;
            webpush.setVapidDetails(
                'mailto:soporte@pro247ya.com',
                vapidPublicKey,
                vapidPrivateKey
            );

            const subscription = JSON.parse(pushSubscriptionRaw);
            const payload = JSON.stringify({ title, body, url: url ?? '/', icon: '/icon-192.png' });

            await webpush.sendNotification(subscription, payload);
            console.info('[push-client] Web Push (iOS) sent to', customerUid);
            return NextResponse.json({ ok: true, channel: 'webpush-ios' });
        }

        // No push channel available
        return NextResponse.json({ ok: true, skipped: true, reason: 'no_token_or_subscription' });

    } catch (err: any) {
        console.error('[push-client] Error:', err);
        return NextResponse.json({ ok: false, error: err.message }, { status: 200 });
    }
}
