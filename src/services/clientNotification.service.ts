import { db } from '@/lib/firebase';
import {
    collection, addDoc, updateDoc, doc, query, where,
    onSnapshot, orderBy, limit, serverTimestamp, getDocs, writeBatch
} from 'firebase/firestore';

// ── Types ─────────────────────────────────────────────────────────────────────

export type ClientNotifType =
    | 'appointment_confirmed'    // Business confirmed the appointment
    | 'appointment_rejected'     // Business rejected the appointment
    | 'appointment_cancelled'    // Business cancelled after confirming
    | 'booking_created'          // NEW BOOKINGS SYSTEM
    | 'booking_confirmed'        // NEW BOOKINGS SYSTEM
    | 'booking_canceled'         // NEW BOOKINGS SYSTEM
    | 'proof_approved'           // Legacy
    | 'proof_rejected'           // Legacy
    | 'payment_approved'         // NEW BOOKINGS SYSTEM
    | 'payment_rejected'         // NEW BOOKINGS SYSTEM
    | 'new_message';             // Business replied in chat

export interface ClientNotification {
    id: string;
    clientUid: string;
    type: ClientNotifType;
    read: boolean;
    relatedId?: string;           // appointmentId or chatId
    i18nKey?: string;
    variables?: Record<string, string>;
    title?: string;               // Legacy fallback
    body?: string;                // Legacy fallback
    serviceName?: string;         // Name of the booked service
    createdAt: any;
    readAt?: any;
}

// ── Collection path ───────────────────────────────────────────────────────────
const col = (clientUid: string) =>
    collection(db, 'client_notifications', clientUid, 'items');

// ── Service ───────────────────────────────────────────────────────────────────
export const ClientNotificationService = {

    /** Write a new notification for a client */
    async create(
        clientUid: string,
        notif: Omit<ClientNotification, 'id' | 'clientUid' | 'read' | 'createdAt'>
    ): Promise<void> {
        try {
            await addDoc(col(clientUid), {
                ...notif,
                clientUid,
                read: false,
                createdAt: serverTimestamp(),
            });
        } catch (err) {
            console.warn('[ClientNotif] create failed:', err);
        }
    },

    /** Mark ALL notifications as read */
    async markAllRead(clientUid: string): Promise<void> {
        try {
            const snap = await getDocs(
                query(col(clientUid), where('read', '==', false))
            );
            const batch = writeBatch(db);
            snap.docs.forEach(d => batch.update(d.ref, { read: true, readAt: serverTimestamp() }));
            await batch.commit();
        } catch (err) {
            console.warn('[ClientNotif] markAllRead failed:', err);
        }
    },

    /** Real-time unread count — for bell badge */
    onUnreadCount(clientUid: string, cb: (count: number) => void): () => void {
        const q = query(col(clientUid), where('read', '==', false));
        return onSnapshot(q, snap => cb(snap.size), () => cb(0));
    },

    /** Real-time feed — last 30 notifications */
    onNotifications(
        clientUid: string,
        cb: (items: ClientNotification[]) => void
    ): () => void {
        const q = query(col(clientUid), orderBy('createdAt', 'desc'), limit(30));
        return onSnapshot(q, snap => {
            cb(snap.docs.map(d => ({ id: d.id, ...d.data() } as ClientNotification)));
        }, () => cb([]));
    },
};

export const CLIENT_NOTIF_META: Record<ClientNotifType, { emoji: string; color: string; bg: string }> = {
    appointment_confirmed: { emoji: '✅', color: '#10b981', bg: 'bg-emerald-500/10' },
    appointment_rejected: { emoji: '❌', color: '#ef4444', bg: 'bg-red-500/10' },
    appointment_cancelled: { emoji: '🚫', color: '#f97316', bg: 'bg-orange-500/10' },
    booking_created: { emoji: '📅', color: '#3b82f6', bg: 'bg-blue-500/10' },
    booking_confirmed: { emoji: '✅', color: '#10b981', bg: 'bg-emerald-500/10' },
    booking_canceled: { emoji: '🚫', color: '#f97316', bg: 'bg-orange-500/10' },
    proof_approved: { emoji: '🧾', color: '#10b981', bg: 'bg-emerald-500/10' },
    proof_rejected: { emoji: '⚠️', color: '#ef4444', bg: 'bg-red-500/10' },
    payment_approved: { emoji: '🧾', color: '#10b981', bg: 'bg-emerald-500/10' },
    payment_rejected: { emoji: '⚠️', color: '#ef4444', bg: 'bg-red-500/10' },
    new_message: { emoji: '💬', color: '#14b8a6', bg: 'bg-teal-500/10' },
};
