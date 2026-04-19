import { Timestamp } from 'firebase/firestore';

// ==========================================
// 1. User Collection (users/{uid})
// ==========================================

export interface UserRole {
    client: boolean;
    provider: boolean;
    admin: boolean;
    ceo?: boolean;
}

export interface UserSettings {
    unit_km_mi: 'km' | 'mi';
    notifications_enabled?: boolean;
}

export interface ClientProfile {
    fullName: string; // Obligatorio
    avatar: {
        type: 'none' | 'emoji' | 'photo';
        emoji?: string;
        photo_url?: string | null;
        photo_path?: string | null;
        updated_at?: string;
    };
    phone?: string | null; // Privado, uso interno
    favorites?: string[]; // IDs de negocios
    marketing_opt_in?: boolean;
    privacy_policy_accepted: boolean;
    updated_at: string; // ISO String
}

export interface UserDocument {
    uid: string;
    email: string;

    // FASE 3: Identity Integrity Status
    accountStatus: 'pending_verification' | 'active' | 'archived' | 'canceled' | 'blocked' | 'incomplete';
    onboardingStatus: 'not_started' | 'incomplete' | 'completed';
    emailVerified?: boolean;
    legacyTrusted?: boolean;
    canceledAt?: string;
    archivedAt?: string;
    reactivatedAt?: string;
    isBanned?: boolean; // Legacy ban system

    roles: UserRole;
    role: 'client' | 'provider' | null; // Primary active role
    createdAt: Timestamp;
    lastLogin: Timestamp;
    country_code: string; // ISO2: "HN", "US", "MX"
    locale: 'es' | 'en' | 'pt';
    settings: UserSettings;
    userLocation?: {
        address?: string | null;
        placeId?: string | null;
        lat?: number | null;
        lng?: number | null;
        countryCode?: string | null;
        timestamp?: number | null;
        denied?: boolean;
    };

    // Optional flattened profile fields for easier access in CRM
    displayName?: string;
    phoneNumber?: string;
    isVip?: boolean;

    // Perfil Cliente (Siempre existe, aunque sea básico)
    clientProfile: ClientProfile;

    // Estado Negocio
    businessProfileId?: string | null;
    isBusinessActive: boolean;
    isProvider?: boolean;
    providerOnboardingStatus?: 'pending_plan' | 'pending_setup' | 'pending_trial' | 'completed';
    selectedPlan?: 'premium' | 'plus_team';
    
    // Suscripción
    subscription?: {
        plan: 'premium' | 'plus_team';
        status: 'trial' | 'requires_payment_method' | 'canceled' | 'active' | 'expired';
        trialStartAt: number;
        trialEndAt: number;
        isActive: boolean;
    };

    // Admin flag — set by set-admin.js script
    isAdmin?: boolean;
    adminSetAt?: string;
}

// ==========================================
// 1.5 VIP Collaborator Invites
// ==========================================
export type VipInviteStatus = 'pending' | 'used' | 'revoked';
export type VipInviteType = 'email' | 'code';

export interface VipInvite {
    id: string;                         // Auto-generated Firestore ID
    type: VipInviteType;                // 'email' or 'code'
    email?: string | null;              // Valid if type === 'email'
    code?: string | null;               // Valid if type === 'code' (e.g. VIP-123)
    status: VipInviteStatus;
    registeredBusinessId?: string;      // ID of business once used
    registeredUserId?: string;          // ID of user once used
    createdBy: string;                  // Admin UID who created it
    createdAt: any;                     // Timestamp
    usedAt?: any;                       // Timestamp
}

// ==========================================
// 2. Business Collection (businesses/{businessId})
// ==========================================

export type BusinessStatus = 'draft' | 'pending_review' | 'active' | 'suspended';

// Legacy — kept for DB back-compat, use BusinessPlan going forward
export type BusinessTier = 'free' | 'pro' | 'enterprise';

// ── Subscription Plans ──
export type BusinessPlan = 'free' | 'premium' | 'plus_team' | 'vip';
export type BusinessPlanStatus = 'active' | 'trialing' | 'expired' | 'cancelled' | 'paused' | 'inactive';
export type BusinessPlanSource = 'revenuecat' | 'stripe' | 'pagadito' | 'crm_override' | 'collaborator_beta';

export interface BusinessPlanData {
    plan: BusinessPlan;                 // Current active plan
    planStatus: BusinessPlanStatus;     // Billing status
    planSource: BusinessPlanSource;     // Which gateway originated the plan
    planExpiresAt?: any;                // Timestamp — null = no expiry (VIP/override)
    teamMemberLimit: number;            // 0=free/premium  5=plus_team  999=vip
    overriddenByCRM: boolean;           // Admin manually set the plan
    revenueCatUserId?: string;
    stripeCustomerId?: string;
    pagaditoToken?: string;
    // Trial
    trialStartDate?: any;
    trialEndDate?: any;
}

export interface BusinessLocation {
    lat: number;
    lng: number;
    address?: string | null; // No obligatorio, zona aproximada para guests
    city?: string | null;
    coverageRadiusKm: number;
}

export interface SocialMedia {
    instagram?: string | null;
    facebook?: string | null;
    tiktok?: string | null;
}

export interface BusinessContact {
    contactPhone?: string | null; // PRIVADO (Solo registrados)
    whatsapp?: string | null;     // PRIVADO (Solo registrados)
    website?: string | null;
    socialMedia?: SocialMedia;
}

export interface BusinessTaxonomy {
    main: string;        // ID Categoría Principal
    sub: string;         // ID Subcategoría
    specialties: string[]; // Array de strings
}

export interface PaymentSettings {
    acceptsCash: boolean;
    acceptsBankTransfer: boolean;
    bankTransferDetails?: string; // Limit 500 chars
    acceptsDigitalWallet: boolean;
    digitalWalletDetails?: string; // "PayPal: x@x.com"
    requiresDeposit: boolean;
    depositType?: 'percent' | 'fixed';
    depositValue?: number;
    depositNotes?: string;
    paymentProofRequired?: boolean;
    updatedAt?: any; // Timestamp
}

export interface BusinessProfile {
    id: string;
    ownerUid: string;
    status: BusinessStatus;
    tier: BusinessTier;

    // Identidad
    brandName: string;
    slug: string;
    description: string;
    logoUrl?: string | null;
    coverPhotos?: string[]; // URLs

    // Privacidad / Contacto
    contact: BusinessContact;

    // Payment Settings (New)
    paymentSettings?: PaymentSettings;

    // Ajustes de Agenda (Double Booking)
    bookingSettings?: {
        allowDoubleBooking: boolean;
    };

    // Ubicación
    location: BusinessLocation;

    // Taxonomía
    categories: BusinessTaxonomy;

    // Métricas Públicas
    rating: number; // 0-5
    reviewCount: number;
    responseRate?: string | null; // "1h", "24h"

    createdAt: Timestamp;
    updatedAt: Timestamp;

    // ── Subscription plan (defaults to VIP collaborator during beta) ──
    planData?: BusinessPlanData;

    // ── Collaborator metadata (present when planSource === 'collaborator_beta') ──
    collaboratorData?: CollaboratorData;
}

// ==========================================
// 3. Service Sub-Collection (businesses/{bid}/services/{sid})
// ==========================================

export interface ServiceItem {
    id: string;
    name: string;
    description?: string | null;
    price: number;
    currency: string; // "HNL", "USD"
    durationMinutes: number;
    isVariablePrice: boolean; // "Desde $X"
    isActive: boolean;
}

// ==========================================
// 4. Collaborator Data (embedded in BusinessProfile)
// ==========================================

/** Present when planSource === 'collaborator_beta'. Tracks the full lifecycle. */
export interface CollaboratorData {
    requestNote?: string;          // Note from collaborator at signup
    activatedAt?: any;             // Timestamp when admin activated
    activatedBy?: string;          // Admin uid
    pausedAt?: any;                // Timestamp when paused
    pausedBy?: string;             // Admin uid
    pauseReason?: string;          // Reason shown to the collaborator
    deactivatedAt?: any;
    deactivatedBy?: string;
    lastActionAt?: any;            // Latest admin action timestamp
    lastActionBy?: string;
}

// ==========================================
// 5. Bookings Collection (bookings)
// ==========================================

export type BookingStatus = 'pending' | 'confirmed' | 'canceled' | 'completed';
export type PaymentStatus = 'pending' | 'instructions_sent' | 'proof_uploaded' | 'confirmed' | 'rejected' | 'completed';
export type PaymentMethod = 'manual' | 'external' | 'future_integrated';

// Preparatory structure for Phase 2 multiple employees/slots
export interface SlotMetadata {
    employeeId?: string; // Phase 2
    resourceId?: string; // Phase 2
}

export interface BookingDocument {
    id: string;
    businessId: string;
    clientId: string;
    crmCustomerId?: string; // Internal CRM representation hook
    clientName?: string;
    clientEmail?: string;
    clientPhone?: string;
    serviceId: string;
    serviceName: string;
    date: string; // YYYY-MM-DD
    time: string; // HH:mm (24h)
    duration: number; // minutes
    status: BookingStatus;
    
    // Future multiple slots preparedness
    slotMetadata?: SlotMetadata;
    employeeId?: string;
    notes?: string;
    
    paymentStatus: PaymentStatus;
    paymentMethod: PaymentMethod;
    paymentProof?: {
        url: string;
        type: 'image' | 'pdf';
        uploadedAt: any;
        fileName?: string;
    };
    totalAmount: number;
    depositAmount: number;
    remainingAmount: number;
    currency: string; // Enforced from business
    
    notesClient?: string;
    notesBusiness?: string;
    
    // Interaction tracking for notification queues
    clientReadReceipt?: boolean;
    businessReadReceipt?: boolean;
    
    // Client-side visual deletion
    hiddenByClient?: boolean;
    hiddenByBusiness?: boolean;
    
    createdAt: any; // Timestamp
    updatedAt: any; // Timestamp
}

// ==========================================
// 6. Notification Queue Collection (notification_queue)
// ==========================================

export type NotificationChannel = 'push' | 'email';
export type NotificationType = 'booking_created' | 'booking_created_client' | 'booking_confirmed' | 'booking_canceled' | 'booking_completed' | 'message_received' | 'booking_reminder' | 'proof_uploaded' | 'proof_uploaded_business' | 'proof_approved' | 'proof_rejected';
export type NotificationStatus = 'pending' | 'sent' | 'cancelled';

export interface NotificationQueueDocument {
    id: string; // Auto
    targetUid: string;
    targetEmail?: string;
    channel: NotificationChannel;
    type: NotificationType;
    entityId: string; // booking.id OR chatRoom.id
    payload?: any; // Additional data for template rendering
    proofUrl?: string; // Opt for payment receipts images
    
    scheduledFor: any; // Timestamp
    attempts: number; // 0, 1, 2
    status: NotificationStatus;
    
    createdAt: any; // Timestamp
    updatedAt: any; // Timestamp
    sentAt?: any; // Timestamp
    cancelledAt?: any; // Timestamp
    openedAt?: any; // Timestamp
}
