import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin'; 
// Using firebaseAdmin since this is a server route doing background jobs
import * as admin from 'firebase-admin';

import { EmailService } from '@/services/email.service';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: Request) {
    // 1. Dual Compatibility Authorization (Vercel Cron OR External Trigger)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    // Check Vercel's automatic cron header or our custom bearer token
    const isVercelCron = request.headers.get('x-vercel-cron') === '1';
    const isExternalValid = authHeader === `Bearer ${cronSecret}`;

    if (!isVercelCron && !isExternalValid) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        console.log('[CRON] Starting Notification Queue Processing...');
        
        // Find all pending notifications where scheduledFor is in the past
        const now = admin.firestore.Timestamp.now();
        const queueRef = db.collection('notification_queue');
        const snapshot = await queueRef
            .where('status', '==', 'pending')
            .where('scheduledFor', '<=', now)
            .limit(100)
            .get();

        if (snapshot.empty) {
            console.log('[CRON] No pending notifications to process.');
            return NextResponse.json({ success: true, processed: 0 });
        }

        const batch = db.batch();
        let processedCount = 0;

        for (const doc of snapshot.docs) {
            const data = doc.data();
            
            if (data.channel === 'email') {
                try {
                    const bookingSnap = await db.collection('bookings').doc(data.entityId).get();
                    if (!bookingSnap.exists) {
                        throw new Error(`Booking ${data.entityId} not found.`);
                    }
                    const booking = bookingSnap.data() as any;

                    const bizSnap = await db.collection('businesses').doc(booking.businessId).get();
                    const bizName = bizSnap.data()?.name || 'Pro24/7 Proveedor';

                    const emailPayload = {
                        to: data.targetEmail,
                        businessName: bizName,
                        serviceName: booking.serviceName,
                        clientName: booking.clientName || booking.clientInfo?.name || 'Cliente',
                        date: booking.date,
                        time: booking.time,
                        bookingId: data.entityId,
                        proofUrl: (data as any).proofUrl, // Inject if present
                        locale: booking.locale || 'es'
                    };

                    switch (data.type) {
                        case 'booking_created':
                            await EmailService.sendBookingCreatedEmail(emailPayload);
                            break;
                        case 'booking_created_client':
                            await EmailService.sendClientBookingCreatedEmail(emailPayload);
                            break;
                        case 'proof_uploaded_business':
                            await EmailService.sendProofUploadedBusinessEmail(emailPayload);
                            break;
                        case 'booking_confirmed':
                            await EmailService.sendBookingConfirmedEmail(emailPayload);
                            break;
                        case 'booking_canceled':
                            await EmailService.sendBookingCancelledEmail(emailPayload);
                            break;
                        case 'proof_approved':
                            await EmailService.sendPaymentProofApprovedEmail(emailPayload);
                            break;
                        case 'proof_rejected':
                            await EmailService.sendPaymentProofRejectedEmail(emailPayload);
                            break;
                        default:
                            console.warn(`[CRON] Unknown email type: ${data.type}`);
                    }

                    batch.update(doc.ref, {
                        status: 'sent',
                        sentAt: admin.firestore.FieldValue.serverTimestamp(),
                        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                        attempts: data.attempts + 1
                    });
                    processedCount++;

                    // Minimum protection against Resend rate limits (5 per second)
                    // Wait ~250ms between consecutive emails
                    await new Promise(r => setTimeout(r, 250));

                } catch (emailError: any) {
                    console.error(`[CRON] Failed to send email for doc ${doc.id}:`, emailError);
                    batch.update(doc.ref, {
                        status: data.attempts >= 3 ? 'failed' : 'pending',
                        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                        attempts: data.attempts + 1,
                        lastError: emailError.message
                    });
                }
            } else {
                // Future expansion (push/sms)
                batch.update(doc.ref, {
                    status: 'sent',
                    sentAt: admin.firestore.FieldValue.serverTimestamp(),
                    attempts: data.attempts + 1
                });
                processedCount++;
            }
        }

        await batch.commit();

        console.log(`[CRON] Successfully processed ${processedCount} notifications.`);
        return NextResponse.json({ success: true, processed: processedCount });

    } catch (error: any) {
        console.error('[CRON] Error processing notifications:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
