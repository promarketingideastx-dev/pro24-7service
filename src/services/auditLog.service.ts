import {
    collection, addDoc, query, orderBy, limit,
    onSnapshot, serverTimestamp, where, getDocs
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

// ── Types ────────────────────────────────────────────────────────────────────
export type AuditAction =
    | 'business.plan_changed'
    | 'business.suspended'
    | 'business.reactivated'
    | 'business.deleted'
    | 'user.blocked'
    | 'user.unblocked'
    | 'user.role_changed'
    | 'dispute.status_changed'
    | 'dispute.reply_sent'
    | 'dispute.assigned'
    | 'notification.mark_all_read'
    | 'admin.login'
    | 'admin.settings_changed'
    | 'collaborator.activated'
    | 'collaborator.paused'
    | 'collaborator.deactivated'
    | 'collaborator.deleted';

export interface AuditEntry {
    id: string;
    action: AuditAction;
    actorUid: string;
    actorName: string;
    targetId?: string;       // businessId, userId, disputeId, etc.
    targetName?: string;     // Human label
    targetType?: string;     // 'business' | 'user' | 'dispute'
    before?: Record<string, any>;  // Previous value snapshot
    after?: Record<string, any>;   // New value snapshot
    meta?: Record<string, any>;    // Extra context
    country?: string;
    createdAt: any;          // Timestamp
    ipAddress?: string;      // Optional, client IP
}

// ── Service ──────────────────────────────────────────────────────────────────
const COL = 'audit_log';

export const AuditLogService = {
    /**
     * Write an immutable audit entry. Never call updateDoc/deleteDoc on audit_log.
     */
    async log(entry: Omit<AuditEntry, 'id' | 'createdAt'>): Promise<void> {
        try {
            await addDoc(collection(db, COL), {
                ...entry,
                createdAt: serverTimestamp(),
            });
        } catch (err) {
            // Non-blocking — we never want audit logging to break the main action
            console.warn('[AuditLog] Failed to write:', err);
        }
    },

    /**
     * Real-time listener for the audit log table
     */
    onEntries(
        filters: { limitN?: number; actorUid?: string; targetType?: string; country?: string },
        callback: (entries: AuditEntry[]) => void
    ): () => void {
        const q = query(
            collection(db, COL),
            orderBy('createdAt', 'desc'),
            limit(filters.limitN ?? 200)
        );
        return onSnapshot(q, snap => {
            let entries = snap.docs.map(d => ({ id: d.id, ...d.data() } as AuditEntry));
            if (filters.actorUid) entries = entries.filter(e => e.actorUid === filters.actorUid);
            if (filters.targetType) entries = entries.filter(e => e.targetType === filters.targetType);
            if (filters.country && filters.country !== 'ALL') entries = entries.filter(e => e.country === filters.country);
            callback(entries);
        }, () => callback([]));
    },
};

// ── Action labels (for display) ──────────────────────────────────────────────
export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
    'business.plan_changed': 'Plan cambiado',
    'business.suspended': 'Negocio suspendido',
    'business.reactivated': 'Negocio reactivado',
    'business.deleted': 'Negocio eliminado',
    'user.blocked': 'Usuario bloqueado',
    'user.unblocked': 'Usuario desbloqueado',
    'user.role_changed': 'Rol cambiado',
    'dispute.status_changed': 'Disputa actualizada',
    'dispute.reply_sent': 'Respuesta enviada',
    'dispute.assigned': 'Disputa asignada',
    'notification.mark_all_read': 'Notificaciones leídas',
    'admin.login': 'Admin inició sesión',
    'admin.settings_changed': 'Configuración cambiada',
    'collaborator.activated': 'Colaborador VIP activado',
    'collaborator.paused': 'Colaborador VIP pausado',
    'collaborator.deactivated': 'Colaborador VIP desactivado',
    'collaborator.deleted': 'Colaborador VIP eliminado',
};

export const AUDIT_ACTION_EMOJI: Record<AuditAction, string> = {
    'business.plan_changed': '⭐',
    'business.suspended': '🚫',
    'business.reactivated': '✅',
    'business.deleted': '🗑️',
    'user.blocked': '🔒',
    'user.unblocked': '🔓',
    'user.role_changed': '👤',
    'dispute.status_changed': '⚖️',
    'dispute.reply_sent': '💬',
    'dispute.assigned': '📋',
    'notification.mark_all_read': '🔔',
    'admin.login': '🛡️',
    'admin.settings_changed': '⚙️',
    'collaborator.activated': '👑',
    'collaborator.paused': '⏸️',
    'collaborator.deactivated': '❌',
    'collaborator.deleted': '🗑️',
};
