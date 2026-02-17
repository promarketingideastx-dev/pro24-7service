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
export type BusinessTier = 'free' | 'pro' | 'enterprise';

export interface BusinessLocation {
    lat: number;
    lng: number;
    address?: string | null; // No obligatorio, zona aproximada para guests
    city?: string | null;
    coverageRadiusKm: number;
}

export interface BusinessContact {
    contactPhone?: string | null; // PRIVADO (Solo registrados)
    whatsapp?: string | null;     // PRIVADO (Solo registrados)
    website?: string | null;
}

export interface BusinessTaxonomy {
    main: string;        // ID Categoría Principal
    sub: string;         // ID Subcategoría
    specialties: string[]; // Array de strings
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
