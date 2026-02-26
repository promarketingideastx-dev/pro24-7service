import { NextRequest, NextResponse } from 'next/server';

// Force Node.js runtime — required for firebase-admin (cannot run in Edge)
export const runtime = 'nodejs';

// ── Lazy-load firebase-admin to avoid webpack bundling issues ─────────────────
async function getAdminSDK() {
    // Dynamic import prevents webpack from trying to bundle firebase-admin
    const admin = (await import('firebase-admin')).default;
    const { getApps, initializeApp, cert } = await import('firebase-admin/app');
    const { getFirestore } = await import('firebase-admin/firestore');
    const { getMessaging } = await import('firebase-admin/messaging');

    if (!getApps().length) {
        let credential;

        if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
            // Production: read from env variable
            const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
            credential = cert(serviceAccount);
        } else {
            // Local dev: read from file
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

    return {
        db: getFirestore(),
        messaging: getMessaging(),
    };
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

        // 1. Fetch FCM token from Firestore
        const userDoc = await sdk.db.collection('users').doc(customerUid).get();
        const fcmToken = userDoc.data()?.fcmToken as string | undefined;

        if (!fcmToken) {
            return NextResponse.json({ ok: true, skipped: true, reason: 'no_token' });
        }

        // 2. Send push notification
        await sdk.messaging.send({
            token: fcmToken,
            notification: { title, body },
            webpush: {
                notification: {
                    icon: '/icons/icon-192.png',
                    badge: '/icons/icon-192.png',
                    vibrate: [200, 100, 200],
                },
                fcmOptions: { link: url ?? '/' },
            },
            data: { url: url ?? '/' },
        });

        return NextResponse.json({ ok: true });

    } catch (err: any) {
        console.error('[push-client] Error:', err);
        return NextResponse.json({ ok: false, error: err.message }, { status: 200 });
    }
}
