import { Timestamp } from 'firebase/firestore';

// ── Admin Notifications ──────────────────────────────────────────────────────
// Collection: admin_notifications/{id}
export type AdminNotificationType =
    | 'new_business'                // Business registered
    | 'new_user'                    // User signed up
    | 'new_dispute'                 // Dispute ticket opened
    | 'dispute_reply'               // User replied to dispute
    | 'plan_upgrade'                // Business upgraded plan
    | 'payment_failed'              // Payment failed
    | 'review_flagged'              // Review flagged by business
    | 'new_collaborator_request'    // New VIP collaborator registered ← NEW
    | 'collaborator_activated'      // Admin activated a collaborator ← NEW
    | 'collaborator_paused'         // Admin paused a collaborator ← NEW
    | 'system';                     // General system notification

export interface AdminNotification {
    id: string;
    type: AdminNotificationType;
    title: string;
    body: string;
    read: boolean;
    country?: string;                    // ISO2 — for country filter
    relatedId?: string;                  // businessId, userId, disputeId
    relatedName?: string;                // Human-readable name of related entity
    createdAt: Timestamp;
    readAt?: Timestamp;
}

// ── Disputes ─────────────────────────────────────────────────────────────────
// Collection: disputes/{id}
export type DisputeStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type DisputeCategory =
    | 'billing'
    | 'service_quality'
    | 'false_review'
    | 'account_access'
    | 'abuse'
    | 'other';

export type DisputePriority = 'low' | 'medium' | 'high' | 'critical';

export interface DisputeMessage {
    id: string;
    authorUid: string;
    authorName: string;
    authorRole: 'user' | 'business' | 'admin';
    body: string;
    createdAt: Timestamp;
    attachments?: string[];  // Storage URLs
}

export interface DisputeDocument {
    id: string;
    title: string;
    description: string;
    category: DisputeCategory;
    priority: DisputePriority;
    status: DisputeStatus;

    // Reporter
    reporterUid: string;
    reporterName: string;
    reporterEmail?: string;
    reporterRole: 'user' | 'business';

    // Related entities
    businessId?: string;
    businessName?: string;
    country?: string;

    // Resolution
    assignedToUid?: string;
    assignedToName?: string;
    resolutionNote?: string;
    resolvedAt?: Timestamp;

    // Timestamps
    createdAt: Timestamp;
    updatedAt: Timestamp;
    lastReplyAt?: Timestamp;

    // Counts
    messageCount: number;
    unreadByAdmin: boolean;
}
