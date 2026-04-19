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
        const res = await fetch('/api/enqueue-notification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'enqueueForBookingCreation',
                payload: { bookingId, businessId, clientId, clientName, serviceName, businessEmail }
            })
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || 'Fallo crítico al encolar notificaciones en el servidor.');
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
        const res = await fetch('/api/enqueue-notification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'enqueueForClientBookingCreated',
                payload: { bookingId, clientId, clientEmail, businessName, serviceName }
            })
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || 'Server enqueue failed for client');
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
        const res = await fetch('/api/enqueue-notification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'enqueueForBookingStatusChange',
                payload: { bookingId, clientId, clientEmail, businessName, newStatus }
            })
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || 'Server enqueue failed for status change');
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
        const res = await fetch('/api/enqueue-notification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'enqueueForPaymentProofStatus',
                payload: { bookingId, clientId, clientEmail, businessName, newStatus }
            })
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || 'Server enqueue failed for payment proof status');
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
        const res = await fetch('/api/enqueue-notification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'enqueueForProofUploaded',
                payload: { bookingId, businessId, businessEmail, clientName, proofUrl }
            })
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || 'Server enqueue failed for proof uploaded');
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
    },

    /** Cancel ALL pending notifications for a specific user regardless of sender (True Stop-At-Sight) */
    async cancelAllPendingForTarget(targetUid: string): Promise<void> {
        try {
            const q = query(
                collection(db, 'notification_queue'),
                where('targetUid', '==', targetUid),
                where('status', '==', 'pending')
            );
            
            const snap = await getDocs(q);
            if (snap.empty) return;

            const batch = writeBatch(db);
            snap.docs.forEach(d => {
                batch.update(d.ref, {
                    status: 'canceled',
                    canceledAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                    reason: 'interaction_detected'
                });
            });
            await batch.commit();
            console.log(`[NotificationQueue] Cancelled ${snap.size} pending emails for ${targetUid}`);
        } catch (error) {
            console.error('[NotificationQueue] Error bulk cancelling queue:', error);
        }
    }
};
