import { NextRequest, NextResponse } from 'next/server';

// Force Node.js runtime — required for firebase-admin and web-push
export const runtime = 'nodejs';

declare var __non_webpack_require__: (id: string) => any;

async function getAdminSDK() {
    const { getApps, initializeApp, cert } = await import('firebase-admin/app');
    const { getFirestore } = await import('firebase-admin/firestore');
    const { getMessaging } = await import('firebase-admin/messaging');

    if (!getApps().length) {
        let credential;
        if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
            const serviceAccountStr = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
            const matchProjectId = serviceAccountStr.match(/"project_id"\s*:\s*"([^"]+)"/);
            const matchClientEmail = serviceAccountStr.match(/"client_email"\s*:\s*"([^"]+)"/);
            const matchPrivateKey = serviceAccountStr.match(/"private_key"\s*:\s*"([^"]+)"/);
            
            if (matchProjectId && matchClientEmail && matchPrivateKey) {
                credential = cert({
                    projectId: matchProjectId[1],
                    clientEmail: matchClientEmail[1],
                    privateKey: matchPrivateKey[1].replace(/\\n/g, '\n')
                });
            } else {
                throw new Error("Missing required credentials in FIREBASE_SERVICE_ACCOUNT_JSON regex match. JSON parse fallback dropped for security.");
            }
        } else {
            try {
                // eslint-disable-next-line @typescript-eslint/no-require-imports
                const serviceAccount = __non_webpack_require__('../../../../serviceAccountKey.json');
                credential = cert(serviceAccount);
            } catch {
                return null;
            }
        }
        initializeApp({ credential });
    }

    return { db: getFirestore(), messaging: getMessaging() };
}

export async function POST(req: NextRequest) {
    try {
        const sdk = await getAdminSDK();
        if (!sdk) {
            console.warn('[push-business] Firebase Admin not initialized — push skipped');
            return NextResponse.json({ ok: true, skipped: true });
        }

        const { businessUid, title, body, url } = await req.json() as {
            businessUid?: string;
            title: string;
            body: string;
            url?: string;
        };

        if (!businessUid) {
            return NextResponse.json({ ok: true, skipped: true, reason: 'no_uid' });
        }

        // Business owners register their push tokens under the users collection
        const userDoc = await sdk.db.collection('users').doc(businessUid).get();
        const userData = userDoc.data();

        const fcmToken = userData?.fcmToken as string | undefined;
        const pushSubscriptionRaw = userData?.pushSubscription as string | undefined;

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
                console.info('[push-business] FCM push sent to business', businessUid);
                return NextResponse.json({ ok: true, channel: 'fcm' });
            } catch (fcmErr: any) {
                console.warn('[push-business] FCM failed:', fcmErr.message);
            }
        }

        if (pushSubscriptionRaw) {
            const vapidPublicKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
            const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

            if (!vapidPublicKey || !vapidPrivateKey) {
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
            console.info('[push-business] Web Push sent to business', businessUid);
            return NextResponse.json({ ok: true, channel: 'webpush-ios' });
        }

        return NextResponse.json({ ok: true, skipped: true, reason: 'no_token_or_subscription' });

    } catch (err: any) {
        console.error('[push-business] Error:', err);
        return NextResponse.json({ ok: false, error: err.message }, { status: 200 });
    }
}
