import {
    collection, query, orderBy, limit, onSnapshot,
    doc, updateDoc, addDoc, getDocs, where,
    Timestamp, serverTimestamp, writeBatch, getDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { AdminNotification, AdminNotificationType } from '@/types/admin-notifications';

const COL = 'admin_notifications';

export const AdminNotificationService = {

    /**
     * Real-time listener for unread count (used in sidebar badge)
     */
    onUnreadCount(callback: (count: number) => void): () => void {
        const q = query(
            collection(db, COL),
            where('read', '==', false),
            limit(100)
        );
        return onSnapshot(q, snap => callback(snap.size), () => callback(0));
    },

    /**
     * Real-time listener for the notifications list
     */
    onNotifications(
        limitN: number,
        callback: (notifications: AdminNotification[]) => void
    ): () => void {
        const q = query(
            collection(db, COL),
            orderBy('createdAt', 'desc'),
            limit(limitN)
        );
        return onSnapshot(q, snap => {
            const items: AdminNotification[] = snap.docs.map(d => ({
                id: d.id,
                ...d.data(),
            } as AdminNotification));
            callback(items);
        }, () => callback([]));
    },

    /**
     * Mark a single notification as read
     */
    async markRead(id: string): Promise<void> {
        await updateDoc(doc(db, COL, id), {
            read: true,
            readAt: serverTimestamp(),
        });
    },

    /**
     * Mark ALL unread notifications as read
     */
    async markAllRead(): Promise<void> {
        const q = query(collection(db, COL), where('read', '==', false), limit(200));
        const snap = await getDocs(q);
        const batch = writeBatch(db);
        snap.docs.forEach(d => {
            batch.update(d.ref, { read: true, readAt: serverTimestamp() });
        });
        await batch.commit();
    },

    /**
     * Create a notification (called from admin actions, new registrations, etc.)
     */
    async create(notification: Omit<AdminNotification, 'id' | 'createdAt' | 'read'>): Promise<string> {
        const ref = await addDoc(collection(db, COL), {
            ...notification,
            read: false,
            createdAt: serverTimestamp(),
        });
        return ref.id;
    },

    /**
     * Delete a single notification
     */
    async deleteOne(id: string): Promise<void> {
        const { deleteDoc } = await import('firebase/firestore');
        await deleteDoc(doc(db, COL, id));
    },

    /**
     * Delete multiple notifications by ID (batch)
     */
    async deleteSelected(ids: string[]): Promise<void> {
        if (ids.length === 0) return;
        const batch = writeBatch(db);
        ids.forEach(id => batch.delete(doc(db, COL, id)));
        await batch.commit();
    },

    /**
     * Delete ALL notifications in the collection
     */
    async deleteAll(): Promise<void> {
        const snap = await getDocs(query(collection(db, COL), limit(500)));
        const batch = writeBatch(db);
        snap.docs.forEach(d => batch.delete(d.ref));
        await batch.commit();
    },
};


// ── Icon + color helpers ──────────────────────────────────────────────────────
export const NOTIF_META: Record<AdminNotificationType, { emoji: string; color: string; bg: string }> = {
    new_business: { emoji: '🏢', color: '#22c55e', bg: 'bg-green-500/10' },
    new_user: { emoji: '👤', color: '#60a5fa', bg: 'bg-blue-500/10' },
    new_dispute: { emoji: '⚠️', color: '#ef4444', bg: 'bg-red-500/10' },
    dispute_reply: { emoji: '💬', color: '#f59e0b', bg: 'bg-amber-500/10' },
    plan_upgrade: { emoji: '⭐', color: '#a78bfa', bg: 'bg-purple-500/10' },
    payment_failed: { emoji: '💳', color: '#ef4444', bg: 'bg-red-500/10' },
    review_flagged: { emoji: '🚩', color: '#f59e0b', bg: 'bg-amber-500/10' },
    system: { emoji: '🔔', color: '#94a3b8', bg: 'bg-slate-500/10' },
};
