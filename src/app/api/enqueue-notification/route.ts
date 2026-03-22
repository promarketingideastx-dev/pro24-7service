import { NextRequest, NextResponse } from 'next/server';

// Force Node.js runtime required for firebase-admin
export const runtime = 'nodejs';
declare var __non_webpack_require__: (id: string) => any;

async function getAdminSDK() {
    const { getApps, initializeApp, cert } = await import('firebase-admin/app');
    const { getFirestore } = await import('firebase-admin/firestore');

    if (!getApps().length) {
        let credential;
        if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
            const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
            credential = cert(serviceAccount);
        } else {
            try {
                // eslint-disable-next-line @typescript-eslint/no-require-imports
                const serviceAccount = __non_webpack_require__('../../../../../serviceAccountKey.json');
                credential = cert(serviceAccount);
            } catch {
                return null;
            }
        }
        initializeApp({ credential });
    }
    return { db: getFirestore() };
}

export async function POST(req: NextRequest) {
    try {
        const sdk = await getAdminSDK();
        if (!sdk) {
            console.error('[enqueue-notification] Firebase Admin SDK init failed');
            return NextResponse.json({ error: 'System Error: Internal Admin SDK failed' }, { status: 500 });
        }

        const body = await req.json();
        const { action, payload } = body;

        if (action === 'enqueueForBookingCreation') {
            const { bookingId, businessId, clientId, clientName, serviceName, businessEmail } = payload;
            
            if (!bookingId || !businessId || !businessEmail) {
                return NextResponse.json({ error: 'Missing critical parameters' }, { status: 400 });
            }

            const batch = sdk.db.batch();

            // 1. Instant Internal Push to Business
            const bizNotifRef = sdk.db.collection('businesses').doc(businessId).collection('notifications').doc();
            batch.set(bizNotifRef, {
                title: 'Nueva Cita Recibida',
                body: `${clientName} ha agendado: ${serviceName}`,
                type: 'new_appointment',
                relatedId: bookingId,
                relatedName: clientName,
                createdAt: new Date(),
                isRead: false
            });

            // 2. Queue Multi-Reminders (Immediate, 15, 30, 45)
            const scheduleOffsets = [0, 15, 30, 45];
            for (const offset of scheduleOffsets) {
                const scheduledTime = new Date();
                scheduledTime.setMinutes(scheduledTime.getMinutes() + offset);
                
                const queueRef = sdk.db.collection('notification_queue').doc();
                batch.set(queueRef, {
                    targetUid: businessId,
                    targetEmail: businessEmail,
                    channel: 'email',
                    type: 'booking_created',
                    entityId: bookingId,
                    status: 'pending',
                    scheduledFor: scheduledTime,
                    attempts: 0,
                    createdAt: new Date()
                });
            }
            
            await batch.commit();
            return NextResponse.json({ ok: true });
        }

        if (action === 'enqueueForClientBookingCreated') {
            const { bookingId, clientId, clientEmail, businessName, serviceName } = payload;
            
            if (!bookingId || !clientId || !clientEmail) {
                 return NextResponse.json({ error: 'Missing critical parameters' }, { status: 400 });
            }
            
            const batch = sdk.db.batch();

            // 1. Instant Push to Client
            const clientNotifRef = sdk.db.collection('users').doc(clientId).collection('notifications').doc();
            batch.set(clientNotifRef, {
                title: 'Cita Solicitada',
                body: `Tu cita para ${serviceName} con ${businessName} fue enviada.`,
                type: 'booking_created',
                relatedId: bookingId,
                relatedName: businessName,
                createdAt: new Date(),
                isRead: false
            });

            // 2. Queue Single Immediate Email
            const queueRef = sdk.db.collection('notification_queue').doc();
            batch.set(queueRef, {
                targetUid: clientId,
                targetEmail: clientEmail,
                channel: 'email',
                type: 'booking_created_client',
                entityId: bookingId,
                status: 'pending',
                scheduledFor: new Date(),
                attempts: 0,
                createdAt: new Date()
            });

            await batch.commit();
            return NextResponse.json({ ok: true });
        }

        return NextResponse.json({ error: `Unknown enqueue action: ${action}` }, { status: 400 });

    } catch (err: any) {
        console.error('[enqueue-notification] Caught Exception:', err);
        return NextResponse.json({ error: err.message || 'Server Exception' }, { status: 500 });
    }
}
