import { db } from '@/lib/firebase';
import {
    collection, addDoc, updateDoc, doc, query, where,
    onSnapshot, orderBy, limit, serverTimestamp, getDocs, writeBatch
} from 'firebase/firestore';

// ── Types ─────────────────────────────────────────────────────────────────────

export type BusinessNotifType =
    | 'new_appointment'          // Client booked
    | 'appointment_confirmed'    // Business confirmed → notify client
    | 'appointment_rejected'     // Business rejected  → notify client
    | 'payment_received'         // Payment processed
    | 'new_message';             // Client sent a chat message

export interface BusinessNotification {
    id: string;
    businessId: string;           // Receiver (provider)
    type: BusinessNotifType;
    title: string;
    body: string;
    read: boolean;
    relatedId?: string;           // appointmentId, paymentId, etc.
    relatedName?: string;         // clientName or serviceName
    clientEmail?: string;         // For sending email to client
    createdAt: any;               // Timestamp
    readAt?: any;
}

// ── Collection path ───────────────────────────────────────────────────────────
const col = (businessId: string) =>
    collection(db, 'business_notifications', businessId, 'items');

// ── Service ───────────────────────────────────────────────────────────────────
export const BusinessNotificationService = {

    /** Write a new notification for a business */
    async create(
        businessId: string,
        notif: Omit<BusinessNotification, 'id' | 'businessId' | 'read' | 'createdAt'>
    ): Promise<void> {
        try {
            await addDoc(col(businessId), {
                ...notif,
                businessId,
                read: false,
                createdAt: serverTimestamp(),
            });
        } catch (err) {
            console.warn('[BusinessNotif] create failed:', err);
        }
    },

    /** Mark a single notification as read */
    async markRead(businessId: string, notifId: string): Promise<void> {
        try {
            await updateDoc(
                doc(db, 'business_notifications', businessId, 'items', notifId),
                { read: true, readAt: serverTimestamp() }
            );
        } catch (err) {
            console.warn('[BusinessNotif] markRead failed:', err);
        }
    },

    /** Mark ALL as read */
    async markAllRead(businessId: string): Promise<void> {
        try {
            const snap = await getDocs(
                query(col(businessId), where('read', '==', false))
            );
            const batch = writeBatch(db);
            snap.docs.forEach(d => batch.update(d.ref, { read: true, readAt: serverTimestamp() }));
            await batch.commit();
        } catch (err) {
            console.warn('[BusinessNotif] markAllRead failed:', err);
        }
    },

    /** Real-time unread count — used for bell badge */
    onUnreadCount(businessId: string, cb: (count: number) => void): () => void {
        const q = query(col(businessId), where('read', '==', false));
        return onSnapshot(q, snap => cb(snap.size), () => cb(0));
    },

    /** Real-time feed — last 50 notifications */
    onNotifications(
        businessId: string,
        cb: (items: BusinessNotification[]) => void
    ): () => void {
        const q = query(col(businessId), orderBy('createdAt', 'desc'), limit(50));
        return onSnapshot(q, snap => {
            cb(snap.docs.map(d => ({ id: d.id, ...d.data() } as BusinessNotification)));
        }, () => cb([]));
    },
};

// ── Icon + color meta ─────────────────────────────────────────────────────────
export const BUSINESS_NOTIF_META: Record<BusinessNotifType, { emoji: string; color: string; bg: string }> = {
    new_appointment: { emoji: '📅', color: '#06b6d4', bg: 'bg-cyan-500/10' },
    appointment_confirmed: { emoji: '✅', color: '#10b981', bg: 'bg-emerald-500/10' },
    appointment_rejected: { emoji: '❌', color: '#ef4444', bg: 'bg-red-500/10' },
    payment_received: { emoji: '💳', color: '#a78bfa', bg: 'bg-purple-500/10' },
    new_message: { emoji: '💬', color: '#14b8a6', bg: 'bg-teal-500/10' },
};
