import { NextRequest, NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { getApps } from 'firebase-admin/app';

// ── Initialize Admin SDK (singleton) ──────────────────────────────────────────
if (!getApps().length) {
    try {
        // In production (Vercel), use environment variables
        // In local dev, use serviceAccountKey.json
        if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
            const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
            });
        } else {
            // Local dev — try to load from file
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const serviceAccount = require('../../../../../serviceAccountKey.json');
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
            });
        }
    } catch (err) {
        console.warn('[push-client] Firebase Admin init failed:', err);
    }
}

const db = admin.apps.length ? admin.firestore() : null;
const messaging = admin.apps.length ? admin.messaging() : null;

// ── Route handler ──────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
    if (!db || !messaging) {
        console.warn('[push-client] Firebase Admin not initialized — push skipped');
        return NextResponse.json({ ok: true, skipped: true });
    }

    try {
        const { customerUid, title, body, url } = await req.json() as {
            customerUid?: string;
            title: string;
            body: string;
            url?: string;
        };

        if (!customerUid) {
            // No UID — client was a guest, skip silently
            return NextResponse.json({ ok: true, skipped: true, reason: 'no_uid' });
        }

        // 1. Fetch FCM token from Firestore
        const userDoc = await db.collection('users').doc(customerUid).get();
        const fcmToken = userDoc.data()?.fcmToken as string | undefined;

        if (!fcmToken) {
            return NextResponse.json({ ok: true, skipped: true, reason: 'no_token' });
        }

        // 2. Send the push notification
        await messaging.send({
            token: fcmToken,
            notification: {
                title,
                body,
            },
            webpush: {
                notification: {
                    icon: '/icons/icon-192.png',
                    badge: '/icons/icon-192.png',
                    vibrate: [200, 100, 200],
                },
                fcmOptions: {
                    link: url ?? '/',
                },
            },
            data: {
                url: url ?? '/',
            },
        });

        return NextResponse.json({ ok: true });

    } catch (err: any) {
        console.error('[push-client] Error:', err);
        // Return 200 so the inbox never crashes due to a push failure
        return NextResponse.json({ ok: false, error: err.message }, { status: 200 });
    }
}
