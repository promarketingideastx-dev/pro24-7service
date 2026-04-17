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
                const serviceAccount = JSON.parse(serviceAccountStr);
                if (serviceAccount.private_key) {
                    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
                }
                credential = cert(serviceAccount);
            }
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
            
            if (!bookingId || !businessId) {
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
                read: false
            });

            // 2. Queue Single Immediate Email to Business
            if (businessEmail) {
                const queueRef = sdk.db.collection('notification_queue').doc();
                batch.set(queueRef, {
                    targetUid: businessId,
                    targetEmail: businessEmail,
                    channel: 'email',
                    type: 'booking_created',
                    entityId: bookingId,
                    status: 'pending',
                    scheduledFor: new Date(),
                    attempts: 0,
                    createdAt: new Date()
                });
            }
            
            await batch.commit();
            return NextResponse.json({ ok: true });
        }

        if (action === 'enqueueForClientBookingCreated') {
            const { bookingId, clientId, clientEmail, businessName, serviceName } = payload;
            
            if (!bookingId || !clientId) {
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
                read: false
            });

            // 2. Queue Single Immediate Email
            if (clientEmail) {
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
            }

            await batch.commit();
            return NextResponse.json({ ok: true });
        }

        if (action === 'enqueueForBookingStatusChange') {
            const { bookingId, clientId, clientEmail, businessName, newStatus } = payload;
            
            if (!bookingId || !clientId) {
                return NextResponse.json({ error: 'Missing critical parameters' }, { status: 400 });
            }

            const batch = sdk.db.batch();

            const clientNotifRef = sdk.db.collection('users').doc(clientId).collection('notifications').doc();
            batch.set(clientNotifRef, {
                title: newStatus === 'confirmed' ? 'Cita Confirmada' : 'Cita Cancelada',
                body: newStatus === 'confirmed' 
                    ? `${businessName} ha confirmado tu cita.` 
                    : `${businessName} ha cancelado tu cita.`,
                type: newStatus === 'confirmed' ? 'booking_confirmed' : 'booking_canceled',
                relatedId: bookingId,
                relatedName: businessName,
                createdAt: new Date(),
                read: false
            });

            if (clientEmail) {
                if (newStatus === 'confirmed') {
                    // Reminders
                    const scheduleOffsets = [0, 15, 30, 45];
                    for (const offset of scheduleOffsets) {
                        const scheduledTime = new Date();
                        scheduledTime.setMinutes(scheduledTime.getMinutes() + offset);
                        
                        const queueRef = sdk.db.collection('notification_queue').doc();
                        batch.set(queueRef, {
                            targetUid: clientId,
                            targetEmail: clientEmail,
                            channel: 'email',
                            type: 'booking_confirmed',
                            entityId: bookingId,
                            status: 'pending',
                            scheduledFor: scheduledTime,
                            attempts: 0,
                            createdAt: new Date()
                        });
                    }
                } else {
                    const queueRef = sdk.db.collection('notification_queue').doc();
                    batch.set(queueRef, {
                        targetUid: clientId,
                        targetEmail: clientEmail,
                        channel: 'email',
                        type: 'booking_canceled',
                        entityId: bookingId,
                        status: 'pending',
                        scheduledFor: new Date(),
                        attempts: 0,
                        createdAt: new Date()
                    });
                }
            }

            await batch.commit();
            return NextResponse.json({ ok: true });
        }

        if (action === 'enqueueForPaymentProofStatus') {
            const { bookingId, clientId, clientEmail, businessName, newStatus } = payload;
            
            if (!bookingId || !clientId) {
                 return NextResponse.json({ error: 'Missing critical parameters' }, { status: 400 });
            }

            const batch = sdk.db.batch();

            const clientNotifRef = sdk.db.collection('users').doc(clientId).collection('notifications').doc();
            batch.set(clientNotifRef, {
                title: newStatus === 'proof_approved' ? 'Pago Confirmado' : 'Comprobante Rechazado',
                body: newStatus === 'proof_approved'
                    ? `${businessName} ha verificado tu pago exitosamente.`
                    : `${businessName} ha rechazado tu comprobante. Ingresa para corregirlo.`,
                type: newStatus === 'proof_approved' ? 'payment_approved' : 'payment_rejected',
                relatedId: bookingId,
                relatedName: businessName,
                createdAt: new Date(),
                read: false
            });

            if (clientEmail) {
                if (newStatus === 'proof_rejected') {
                    // Reminders
                    const scheduleOffsets = [0, 15, 30, 45];
                    for (const offset of scheduleOffsets) {
                        const scheduledTime = new Date();
                        scheduledTime.setMinutes(scheduledTime.getMinutes() + offset);
                        
                        const queueRef = sdk.db.collection('notification_queue').doc();
                        batch.set(queueRef, {
                            targetUid: clientId,
                            targetEmail: clientEmail,
                            channel: 'email',
                            type: 'proof_rejected',
                            entityId: bookingId,
                            status: 'pending',
                            scheduledFor: scheduledTime,
                            attempts: 0,
                            createdAt: new Date()
                        });
                    }
                } else {
                    const queueRef = sdk.db.collection('notification_queue').doc();
                    batch.set(queueRef, {
                        targetUid: clientId,
                        targetEmail: clientEmail,
                        channel: 'email',
                        type: 'proof_approved',
                        entityId: bookingId,
                        status: 'pending',
                        scheduledFor: new Date(),
                        attempts: 0,
                        createdAt: new Date()
                    });
                }
            }

            await batch.commit();
            return NextResponse.json({ ok: true });
        }

        if (action === 'enqueueForProofUploaded') {
            const { bookingId, businessId, businessEmail, clientName, proofUrl } = payload;
            
            if (!bookingId || !businessId) {
                return NextResponse.json({ error: 'Missing critical parameters' }, { status: 400 });
            }

            const batch = sdk.db.batch();

            const bizNotifRef = sdk.db.collection('businesses').doc(businessId).collection('notifications').doc();
            batch.set(bizNotifRef, {
                title: 'Nuevo Comprobante Recibido',
                body: `${clientName} ha subido el pago. Requiere tu revisión.`,
                type: 'proof_uploaded',
                relatedId: bookingId,
                relatedName: clientName,
                createdAt: new Date(),
                read: false
            });

            if (businessEmail) {
                // Reminders
                const scheduleOffsets = [0, 15, 30, 45];
                for (const offset of scheduleOffsets) {
                    const scheduledTime = new Date();
                    scheduledTime.setMinutes(scheduledTime.getMinutes() + offset);
                    
                    const queueRef = sdk.db.collection('notification_queue').doc();
                    batch.set(queueRef, {
                        targetUid: businessId,
                        targetEmail: businessEmail,
                        channel: 'email',
                        type: 'proof_uploaded_business',
                        entityId: bookingId,
                        proofUrl: proofUrl || '',
                        status: 'pending',
                        scheduledFor: scheduledTime,
                        attempts: 0,
                        createdAt: new Date()
                    });
                }
            }

            await batch.commit();
            return NextResponse.json({ ok: true });
        }

        return NextResponse.json({ error: `Unknown enqueue action: ${action}` }, { status: 400 });

    } catch (err: any) {
        console.error('[enqueue-notification] Caught Exception:', err);
        return NextResponse.json({ error: err.message || 'Server Exception' }, { status: 500 });
    }
}
