import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';

// Force Node.js runtime required for firebase-admin
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
    try {
        
        const body = await req.json();
        const { action, payload } = body;

        if (action === 'enqueueForBookingCreation') {
            const { bookingId, businessId, clientId, clientName, serviceName, businessEmail } = payload;
            
            if (!bookingId || !businessId) {
                return NextResponse.json({ error: 'Missing critical parameters' }, { status: 400 });
            }

            const batch = db.batch();

            // 1. Instant Internal Push to Business
            const bizNotifRef = db.collection('business_notifications').doc(businessId).collection('items').doc();
            batch.set(bizNotifRef, {
                title: 'Nueva Cita Recibida',
                body: `${clientName} ha agendado: ${serviceName}`,
                type: 'new_appointment',
                relatedId: bookingId,
                relatedName: clientName,
                createdAt: new Date(),
                read: false
            });

            // 2. Queue Multi-Reminder Emails to Business
            if (businessEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(businessEmail)) {
                const scheduleOffsets = [0, 15, 30, 45];
                for (const offset of scheduleOffsets) {
                    const scheduledTime = new Date();
                    scheduledTime.setMinutes(scheduledTime.getMinutes() + offset);
                    
                    const queueRef = db.collection('notification_queue').doc();
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
            }
            
            await batch.commit();
            return NextResponse.json({ ok: true });
        }

        if (action === 'enqueueForClientBookingCreated') {
            const { bookingId, clientId, clientEmail, businessName, serviceName } = payload;
            
            if (!bookingId || !clientId) {
                 return NextResponse.json({ error: 'Missing critical parameters' }, { status: 400 });
            }
            
            const batch = db.batch();

            // 1. Instant Push to Client
            const clientNotifRef = db.collection('client_notifications').doc(clientId).collection('items').doc();
            batch.set(clientNotifRef, {
                title: 'Cita Solicitada',
                body: `Tu cita para ${serviceName} con ${businessName} fue enviada.`,
                type: 'booking_created',
                relatedId: bookingId,
                relatedName: businessName,
                createdAt: new Date(),
                read: false
            });

            // 2. Queue Single Immediate Email to Client (Acknowledge)
            if (clientEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail)) {
                const queueRef = db.collection('notification_queue').doc();
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

            const batch = db.batch();

            const clientNotifRef = db.collection('client_notifications').doc(clientId).collection('items').doc();
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

            if (clientEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail)) {
                if (newStatus === 'confirmed') {
                    // Reminders for Client to Upload Proof
                    const scheduleOffsets = [0, 15, 30, 45];
                    for (const offset of scheduleOffsets) {
                        const scheduledTime = new Date();
                        scheduledTime.setMinutes(scheduledTime.getMinutes() + offset);
                        
                        const queueRef = db.collection('notification_queue').doc();
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
                    const queueRef = db.collection('notification_queue').doc();
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

            const batch = db.batch();

            const clientNotifRef = db.collection('client_notifications').doc(clientId).collection('items').doc();
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

            if (clientEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail)) {
                if (newStatus === 'proof_rejected') {
                    // Reminders for Client to re-upload proof
                    const scheduleOffsets = [0, 15, 30, 45];
                    for (const offset of scheduleOffsets) {
                        const scheduledTime = new Date();
                        scheduledTime.setMinutes(scheduledTime.getMinutes() + offset);
                        
                        const queueRef = db.collection('notification_queue').doc();
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
                    const queueRef = db.collection('notification_queue').doc();
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

            const batch = db.batch();

            const bizNotifRef = db.collection('business_notifications').doc(businessId).collection('items').doc();
            batch.set(bizNotifRef, {
                title: 'Nuevo Comprobante Recibido',
                body: `${clientName} ha subido el pago. Requiere tu revisión.`,
                type: 'proof_uploaded',
                relatedId: bookingId,
                relatedName: clientName,
                createdAt: new Date(),
                read: false
            });

            if (businessEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(businessEmail)) {
                // Reminders to Business to review proof
                const scheduleOffsets = [0, 15, 30, 45];
                for (const offset of scheduleOffsets) {
                    const scheduledTime = new Date();
                    scheduledTime.setMinutes(scheduledTime.getMinutes() + offset);
                    
                    const queueRef = db.collection('notification_queue').doc();
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
