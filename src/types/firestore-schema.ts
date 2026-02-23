import { Timestamp } from 'firebase/firestore';

// ==========================================
// 1. User Collection (users/{uid})
// ==========================================

export interface UserRole {
    client: boolean;
    provider: boolean;
    admin: boolean;
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
    roles: UserRole;
    role: 'client' | 'provider' | null; // Primary active role
    createdAt: Timestamp;
    lastLogin: Timestamp;
    country_code: string; // ISO2: "HN", "US", "MX"
    locale: 'es' | 'en' | 'pt';
    settings: UserSettings;

    // Optional flattened profile fields for easier access in CRM
    displayName?: string;
    phoneNumber?: string;
    address?: string;

    // Perfil Cliente (Siempre existe, aunque sea básico)
    clientProfile: ClientProfile;

    // Estado Negocio
    businessProfileId?: string | null;
    isBusinessActive: boolean;
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
