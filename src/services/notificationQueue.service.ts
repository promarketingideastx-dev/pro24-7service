import { db } from '@/lib/firebase';
import {
    collection,
    addDoc,
    updateDoc,
    doc,
    query,
    where,
    getDocs,
    serverTimestamp,
    Timestamp,
    writeBatch
} from 'firebase/firestore';
import { NotificationQueueDocument, NotificationChannel, NotificationType } from '@/types/firestore-schema';
import { BusinessNotificationService } from './businessNotification.service';
import { ClientNotificationService } from './clientNotification.service';

export const NotificationQueueService = {
    /**
     * Enqueues the standard Multi-Channel sequence for a new booking (For Business)
     * Reminders applied: Immediate, +15m, +30m, +45m
     */
    async enqueueForBookingCreation(
        bookingId: string, 
        businessId: string, 
        clientId: string,
        clientName: string,
        serviceName: string,
        businessEmail: string // Target of the fallback
    ) {
        try {
            // 1. Instant Internal Push to Business
            await BusinessNotificationService.create(businessId, {
                title: 'Nueva Cita Recibida',
                body: `${clientName} ha agendado: ${serviceName}`,
                type: 'new_appointment',
                relatedId: bookingId,
                relatedName: clientName
            });

            // 2. Queue Multi-Reminders (Immediate, 15, 30, 45)
            const scheduleOffsets = [0, 15, 30, 45];
            for (const offset of scheduleOffsets) {
                const scheduledTime = new Date();
                scheduledTime.setMinutes(scheduledTime.getMinutes() + offset);
                
                await this._enqueueDoc({
                    targetUid: businessId,
                    targetEmail: businessEmail,
                    channel: 'email',
                    type: 'booking_created',
                    entityId: bookingId,
                    status: 'pending',
                    scheduledFor: Timestamp.fromDate(scheduledTime),
                    attempts: 0
                });
            }
        } catch (error) {
            console.error('Error enqueueing booking notifications:', error);
        }
    },

    /**
     * Enqueues SINGLE email for the client confirming creation.
     * No reminders applied.
     */
    async enqueueForClientBookingCreated(
        bookingId: string,
        clientId: string,
        clientEmail: string,
        businessName: string,
        serviceName: string
    ) {
        try {
            // 1. Instant Push to Client
            await ClientNotificationService.create(clientId, {
                title: 'Cita Solicitada',
                body: `Tu cita para ${serviceName} con ${businessName} fue enviada.`,
                type: 'booking_created', // Note: Make sure email template handles client perspective or use a generic notification
                relatedId: bookingId,
                relatedName: businessName
            });

            // 2. Queue 1 Single Immediate Email
            await this._enqueueDoc({
                targetUid: clientId,
                targetEmail: clientEmail,
                channel: 'email',
                type: 'booking_created_client', // We map this later in cron
                entityId: bookingId,
                status: 'pending',
                scheduledFor: serverTimestamp(),
                attempts: 0
            });
        } catch (error) {
             console.error('Error enqueueing booking created client notification:', error);
        }
    },

    /**
     * Enqueues notification for the client when a booking is confirmed or canceled.
     * Confirmed = Needs Action/Reminders? The user said "Y aplicar la misma logica de recordatorios: cada 15 min... detenerse cuando vio mensaje".
     * Wait, if approved, it has Reminders. If canceled, NO reminders.
     */
    async enqueueForBookingStatusChange(
        bookingId: string,
        clientId: string,
        clientEmail: string,
        businessName: string,
        newStatus: 'confirmed' | 'canceled'
    ) {
        try {
            const title = newStatus === 'confirmed' ? 'Cita Confirmada' : 'Cita Cancelada';
            const body = newStatus === 'confirmed' 
                ? `${businessName} ha confirmado tu cita.` 
                : `${businessName} ha cancelado tu cita.`;

            // 1. Instant Push to Client
            await ClientNotificationService.create(clientId, {
                title,
                body,
                type: newStatus === 'confirmed' ? 'booking_confirmed' : 'booking_canceled',
                relatedId: bookingId,
                relatedName: businessName
            });

            // 2. Email Queues
            if (newStatus === 'confirmed') {
                // Reminders
                const scheduleOffsets = [0, 15, 30, 45];
                for (const offset of scheduleOffsets) {
                    const scheduledTime = new Date();
                    scheduledTime.setMinutes(scheduledTime.getMinutes() + offset);
                    
                    await this._enqueueDoc({
                        targetUid: clientId,
                        targetEmail: clientEmail,
                        channel: 'email',
                        type: 'booking_confirmed',
                        entityId: bookingId,
                        status: 'pending',
                        scheduledFor: Timestamp.fromDate(scheduledTime),
                        attempts: 0
                    });
                }
            } else {
                // Immediate Exact 1 time (Canceled)
                await this._enqueueDoc({
                    targetUid: clientId,
                    targetEmail: clientEmail,
                    channel: 'email',
                    type: 'booking_canceled',
                    entityId: bookingId,
                    status: 'pending',
                    scheduledFor: serverTimestamp(),
                    attempts: 0
                });
            }

        } catch (error) {
            console.error('Error enqueueing status change notifications:', error);
        }
    },

    /**
     * Enqueues notification for the client when a payment proof is approved or rejected.
     * Rejected = Needs Reminders. Approved = No Reminders (Just instant success).
     * Also, for Proof Uploaded (to business), it will be handled by a new function.
     */
    async enqueueForPaymentProofStatus(
        bookingId: string,
        clientId: string,
        clientEmail: string,
        businessName: string,
        newStatus: 'proof_approved' | 'proof_rejected'
    ) {
        try {
            const title = newStatus === 'proof_approved' ? 'Pago Confirmado' : 'Comprobante Rechazado';
            const body = newStatus === 'proof_approved' 
                ? `${businessName} ha verificado tu pago exitosamente.` 
                : `${businessName} ha rechazado tu comprobante. Por favor revisa y sube uno nuevo.`;

            // 1. Instant Push to Client
            await ClientNotificationService.create(clientId, {
                title,
                body,
                type: newStatus as any,
                relatedId: bookingId,
                relatedName: businessName
            });

            // 2. Email Queues
            if (newStatus === 'proof_rejected') {
                const scheduleOffsets = [0, 15, 30, 45];
                for (const offset of scheduleOffsets) {
                    const scheduledTime = new Date();
                    scheduledTime.setMinutes(scheduledTime.getMinutes() + offset);
                    await this._enqueueDoc({
                        targetUid: clientId,
                        targetEmail: clientEmail,
                        channel: 'email',
                        type: 'proof_rejected',
                        entityId: bookingId,
                        status: 'pending',
                        scheduledFor: Timestamp.fromDate(scheduledTime),
                        attempts: 0
                    });
                }
            } else {
                // Proof Approved = Immediate Only
                await this._enqueueDoc({
                    targetUid: clientId,
                    targetEmail: clientEmail,
                    channel: 'email',
                    type: 'proof_approved',
                    entityId: bookingId,
                    status: 'pending',
                    scheduledFor: serverTimestamp(),
                    attempts: 0
                });
            }
        } catch (error) {
            console.error('Error enqueueing payment proof notifications:', error);
        }
    },

    /**
     * Enqueues notification for the business when a client uploads payment proof.
     * Proof Uploaded to Business = Reminders (+15, +30, +45)
     */
    async enqueueForProofUploaded(
        bookingId: string,
        businessId: string,
        businessEmail: string,
        clientName: string,
        proofUrl: string
    ) {
        try {
            // 1. Push
            await BusinessNotificationService.create(businessId, {
                title: 'Nuevo Comprobante Recibido',
                body: `${clientName} ha subido el pago. Requiere tu revisión.`,
                type: 'proof_uploaded' as any,
                relatedId: bookingId,
                relatedName: clientName
            });

            // 2. Reminders
            const scheduleOffsets = [0, 15, 30, 45];
            for (const offset of scheduleOffsets) {
                const scheduledTime = new Date();
                scheduledTime.setMinutes(scheduledTime.getMinutes() + offset);
                await this._enqueueDoc({
                    targetUid: businessId,
                    targetEmail: businessEmail,
                    channel: 'email',
                    type: 'proof_uploaded_business', // newly mapped
                    entityId: bookingId,
                    proofUrl: proofUrl, // custom property passed downwards
                    status: 'pending',
                    scheduledFor: Timestamp.fromDate(scheduledTime),
                    attempts: 0
                });
            }
        } catch (error) {
            console.error('Error enqueueing proof uploaded notifications:', error);
        }
    },

    /**
     * Centralized queue cancellation.
     * Called when tracking hooks firing (e.g. user opens specific chat or booking)
     */
    async cancelByEntity(targetUid: string, entityId: string) {
        try {
            const q = query(
                collection(db, 'notification_queue'),
                where('targetUid', '==', targetUid),
                where('entityId', '==', entityId),
                where('status', '==', 'pending')
            );
            const snapshot = await getDocs(q);
            
            const promises = snapshot.docs.map(docSnap => 
                updateDoc(doc(db, 'notification_queue', docSnap.id), {
                    status: 'cancelled',
                    cancelledAt: serverTimestamp(),
                    openedAt: serverTimestamp()
                })
            );
            await Promise.all(promises);
            console.log(`[NotificationQueue] Cancelled ${promises.length} pending emails for ${entityId}`);
        } catch (error) {
            console.error('Error cancelling queue items:', error);
        }
    },

    /** Internal generic enqueuer */
    async _enqueueDoc(data: Omit<NotificationQueueDocument, 'id' | 'createdAt' | 'updatedAt'>) {
        await addDoc(collection(db, 'notification_queue'), {
            ...data,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
    },

    /** Cancel ALL pending notifications for a specific user originating from a specific sender (Business <-> Client) */
    async cancelAllForTargetAndSender(targetUid: string, senderId: string): Promise<void> {
        try {
            // Cancel emails where user is the target and the other party is the source
            let q = query(
                collection(db, 'notification_queue'),
                where('targetUid', '==', targetUid),
                where('status', '==', 'pending')
            );
            
            const snap = await getDocs(q);
            const batch = writeBatch(db);
            snap.docs.forEach(d => {
                // In our model, sender is usually 'businessId' or we might need to check 'clientId' depending on direction
                const docData = d.data() as Pick<NotificationQueueDocument, 'targetUid'>;
                // Currently, `notification_queue` documents have 'businessId' and 'targetUid'. 
                // So if senderId === businessId, we cancel it.
                if ((d.data() as any).businessId === senderId || (d.data() as any).clientId === senderId) {
                    batch.update(d.ref, {
                        status: 'canceled',
                        canceledAt: serverTimestamp(),
                        updatedAt: serverTimestamp(),
                        reason: 'interaction_detected'
                    });
                }
            });
            await batch.commit();

        } catch (error) {
            console.error('[NotificationQueue] Error bulk cancelling queue:', error);
        }
    }
};
