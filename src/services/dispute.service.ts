import {
    collection, query, orderBy, limit, onSnapshot,
    doc, updateDoc, addDoc, getDocs, where,
    serverTimestamp, getDoc, Timestamp, writeBatch
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { DisputeDocument, DisputeMessage, DisputeStatus, DisputeCategory, DisputePriority } from '@/types/admin-notifications';

const COL = 'disputes';
const MSGS = 'messages';

export const DisputeService = {

    /**
     * Real-time list with optional filters
     */
    onDisputes(
        filters: { status?: DisputeStatus; country?: string; limitN?: number },
        callback: (disputes: DisputeDocument[]) => void
    ): () => void {
        let q = query(
            collection(db, COL),
            orderBy('createdAt', 'desc'),
            limit(filters.limitN ?? 100)
        );
        return onSnapshot(q, snap => {
            let items = snap.docs.map(d => ({ id: d.id, ...d.data() } as DisputeDocument));
            if (filters.status) items = items.filter(d => d.status === filters.status);
            if (filters.country && filters.country !== 'ALL') items = items.filter(d => d.country === filters.country);
            callback(items);
        }, () => callback([]));
    },

    /**
     * Unread count for sidebar badge
     */
    onUnreadCount(callback: (n: number) => void): () => void {
        const q = query(collection(db, COL), where('unreadByAdmin', '==', true));
        return onSnapshot(q, snap => callback(snap.size), () => callback(0));
    },

    /**
     * Get single dispute
     */
    async get(id: string): Promise<DisputeDocument | null> {
        const snap = await getDoc(doc(db, COL, id));
        return snap.exists() ? { id: snap.id, ...snap.data() } as DisputeDocument : null;
    },

    /**
     * Get messages for a dispute
     */
    onMessages(disputeId: string, callback: (msgs: DisputeMessage[]) => void): () => void {
        const q = query(
            collection(db, COL, disputeId, MSGS),
            orderBy('createdAt', 'asc')
        );
        return onSnapshot(q, snap => {
            callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as DisputeMessage)));
        }, () => callback([]));
    },

    /**
     * Update status
     */
    async updateStatus(id: string, status: DisputeStatus, resolutionNote?: string): Promise<void> {
        const data: any = { status, updatedAt: serverTimestamp() };
        if (status === 'resolved' || status === 'closed') {
            data.resolvedAt = serverTimestamp();
            if (resolutionNote) data.resolutionNote = resolutionNote;
        }
        await updateDoc(doc(db, COL, id), data);
    },

    /**
     * Add admin reply
     */
    async addReply(disputeId: string, adminUid: string, adminName: string, body: string): Promise<void> {
        const msg: Omit<DisputeMessage, 'id'> = {
            authorUid: adminUid,
            authorName: adminName,
            authorRole: 'admin',
            body,
            createdAt: Timestamp.now(),
        };
        await addDoc(collection(db, COL, disputeId, MSGS), msg);
        await updateDoc(doc(db, COL, disputeId), {
            updatedAt: serverTimestamp(),
            lastReplyAt: serverTimestamp(),
            unreadByAdmin: false,
            messageCount: (await getDoc(doc(db, COL, disputeId))).data()?.messageCount + 1 || 1,
        });
    },

    /**
     * Assign to admin
     */
    async assign(id: string, adminUid: string, adminName: string): Promise<void> {
        await updateDoc(doc(db, COL, id), {
            assignedToUid: adminUid,
            assignedToName: adminName,
            status: 'in_progress' as DisputeStatus,
            updatedAt: serverTimestamp(),
        });
    },

    /**
     * Mark as read by admin
     */
    async markRead(id: string): Promise<void> {
        await updateDoc(doc(db, COL, id), { unreadByAdmin: false });
    },

    /**
     * Create new dispute (for testing / manual creation)
     */
    async create(data: Omit<DisputeDocument, 'id' | 'createdAt' | 'updatedAt' | 'messageCount' | 'unreadByAdmin'>): Promise<string> {
        const ref = await addDoc(collection(db, COL), {
            ...data,
            messageCount: 0,
            unreadByAdmin: true,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
        return ref.id;
    },
};

// ── Meta helpers ──────────────────────────────────────────────────────────────
export const STATUS_META: Record<DisputeStatus, { label: string; color: string; bg: string; border: string }> = {
    open: { label: 'Abierto', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30' },
    in_progress: { label: 'En Proceso', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
    resolved: { label: 'Resuelto', color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/30' },
    closed: { label: 'Cerrado', color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/30' },
};

export const PRIORITY_META: Record<DisputePriority, { label: string; color: string }> = {
    low: { label: 'Baja', color: 'text-slate-400' },
    medium: { label: 'Media', color: 'text-amber-400' },
    high: { label: 'Alta', color: 'text-orange-400' },
    critical: { label: 'Crítica', color: 'text-red-400' },
};

export const CATEGORY_LABELS: Record<string, string> = {
    billing: 'Facturación',
    service_quality: 'Calidad de Servicio',
    false_review: 'Reseña Falsa',
    account_access: 'Acceso a Cuenta',
    abuse: 'Abuso',
    other: 'Otro',
};
