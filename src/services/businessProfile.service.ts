import { db } from '@/lib/firebase';
import { doc, setDoc, getDoc, collection, getDocs, addDoc, updateDoc, deleteDoc, writeBatch, serverTimestamp, query, orderBy, arrayUnion, arrayRemove } from 'firebase/firestore';
import { WeeklySchedule } from './employee.service';
import { PaymentSettings } from '@/types/firestore-schema';
import { TrialService } from './trial.service';


// ── Country fallback coordinates ──
const COUNTRY_COORDS: Record<string, { lat: number; lng: number }> = {
    HN: { lat: 14.9, lng: -87.2 }, MX: { lat: 23.6, lng: -102.5 },
    GT: { lat: 15.5, lng: -90.2 }, SV: { lat: 13.8, lng: -89.2 },
    NI: { lat: 12.9, lng: -85.2 }, CR: { lat: 9.7, lng: -84.0 },
    PA: { lat: 8.5, lng: -80.8 }, CO: { lat: 4.5, lng: -74.3 },
    US: { lat: 37.1, lng: -95.7 }, CA: { lat: 56.1, lng: -106.3 },
    BR: { lat: -14.2, lng: -51.9 }, AR: { lat: -38.4, lng: -63.6 },
    ES: { lat: 40.4, lng: -3.7 }, PE: { lat: -9.2, lng: -75.0 },
    CL: { lat: -35.7, lng: -71.5 },
};

// ── Honduras — coordenadas por departamento (capital departamental) ──
const HN_DEPT_COORDS: Record<string, { lat: number; lng: number }> = {
    'atlántida': { lat: 15.7697, lng: -86.7862 }, // La Ceiba
    'choluteca': { lat: 13.2999, lng: -87.1919 }, // Choluteca
    'colón': { lat: 15.8620, lng: -86.0205 }, // Trujillo
    'comayagua': { lat: 14.4532, lng: -87.6376 }, // Comayagua
    'copán': { lat: 14.8380, lng: -89.1465 }, // Santa Rosa de Copán
    'cortés': { lat: 15.5031, lng: -88.0255 }, // San Pedro Sula
    'el paraíso': { lat: 13.7791, lng: -86.3631 }, // Yuscarán
    'francisco morazán': { lat: 14.0899, lng: -87.2021 }, // Tegucigalpa
    'gracias a dios': { lat: 15.9264, lng: -84.5311 }, // Puerto Lempira
    'intibucá': { lat: 14.3154, lng: -88.1769 }, // La Esperanza
    'islas de la bahía': { lat: 16.3350, lng: -86.5291 }, // Roatán
    'la paz': { lat: 14.3200, lng: -87.6738 }, // La Paz
    'lempira': { lat: 14.4338, lng: -88.5727 }, // Gracias
    'ocotepeque': { lat: 14.4365, lng: -89.1832 }, // Nueva Ocotepeque
    'olancho': { lat: 14.7870, lng: -86.2395 }, // Juticalpa
    'santa bárbara': { lat: 14.9196, lng: -88.2348 }, // Santa Bárbara
    'valle': { lat: 13.4441, lng: -87.7311 }, // Nacaome
    'yoro': { lat: 15.1400, lng: -87.1259 }, // Yoro
};

/** Returns the best fallback coordinates given department, city and country */
function getLocationFallback(department?: string, country?: string): { lat: number; lng: number } {
    const cc = (country || 'HN').toUpperCase();
    // For Honduras, try to find by department name (case-insensitive, accent-tolerant)
    if (cc === 'HN' && department) {
        const key = department.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const match = Object.entries(HN_DEPT_COORDS).find(([k]) =>
            k.normalize('NFD').replace(/[\u0300-\u036f]/g, '').startsWith(key) ||
            key.startsWith(k.normalize('NFD').replace(/[\u0300-\u036f]/g, ''))
        );
        if (match) return match[1];
    }
    return COUNTRY_COORDS[cc] ?? { lat: 14.9, lng: -87.2 };
}

/**
 * Geocode a city/state/country to lat/lng using OpenStreetMap Nominatim.
 * Uses countrycodes param (ISO 3166-1 alpha-2) for accurate country filtering.
 * Falls back to department → country centroid if city not found.
 */
async function geocodeAddress(
    city?: string, state?: string, country?: string, address?: string
): Promise<{ lat: number; lng: number }> {
    const countryCode = (country || 'HN').toUpperCase().slice(0, 2);
    const fallback = COUNTRY_COORDS[countryCode] ?? { lat: 14.9, lng: -87.2 };

    // Build queries from most specific to least specific
    const queries: string[] = [];
    if (address && city) queries.push([address, city, state].filter(Boolean).join(', '));
    if (city && state) queries.push([city, state].filter(Boolean).join(', '));
    if (city) queries.push(city);
    if (state) queries.push(state);

    for (const q of queries) {
        try {
            const url = `https://nominatim.openstreetmap.org/search` +
                `?q=${encodeURIComponent(q)}` +
                `&countrycodes=${countryCode.toLowerCase()}` +
                `&format=json&limit=1&addressdetails=0`;
            const res = await fetch(url, {
                headers: { 'User-Agent': 'PRO247CRM/1.0 (admin@pro247.app)' },
            });
            const json = await res.json();
            if (json?.[0]?.lat) {
                return { lat: parseFloat(json[0].lat), lng: parseFloat(json[0].lon) };
            }
        } catch {
            // try next level
        }
    }
    return fallback;
}


export interface BusinessProfileData {
    businessName: string;
    description: string;
    category: string;
    // Legacy: single subcategory (kept for backward-compat with existing DB docs)
    subcategory: string;
    // Legacy: flat specialties array (kept for backward-compat)
    specialties: string[];
    // NEW: up to 3 subcategories within the main category
    subcategories?: string[];
    // NEW: map of subcategoryId → array of selected specific service names (es)
    specialtiesBySubcategory?: Record<string, string[]>;
    additionalCategories?: string[];
    additionalSpecialties?: string[];
    modality: 'home' | 'local' | 'both';
    address?: string;
    city?: string;
    department: string;
    country?: string;
    // Exact GPS coordinates from Google Places (optional — falls back to Nominatim geocoding)
    lat?: number;
    lng?: number;
    placeId?: string;           // Google Place ID for navigation link
    googleMapsUrl?: string;      // Direct "Cómo llegar" URL
    images: string[];
    coverImage?: string;
    logoUrl?: string;
    userId: string;
    email: string;
    phone?: string;
    website?: string;
    socialMedia?: {
        instagram?: string;
        facebook?: string;
        tiktok?: string;
    };
    openingHours?: WeeklySchedule;
    paymentSettings?: PaymentSettings;
}

// --- Services Subcollection Types ---
export interface ServiceData {
    id?: string;
    name: string;                              // Primary name (es) — backward compat
    nameI18n?: { es: string; en: string; pt: string }; // Multi-language names
    description?: string;
    price: number;
    durationMinutes: number;   // Duration in minutes (required for scheduling)
    currency: string;
    category?: string;         // Tied to business specialty
    isExtra?: boolean;         // Add-on service (optional when booking)
    isActive?: boolean;        // Can be toggled off without deleting
    imageUrl?: string;         // Retro-compatibilidad: primera foto del servicio
    images?: string[];         // Hasta 10 fotos para el carrusel del perfil público
    createdAt?: any;
    updatedAt?: any;
}

/** Returns the service name in the active locale, falls back to .name */
export function getServiceName(service: ServiceData, locale: string): string {
    if (!service.nameI18n) return service.name;
    const key = locale === 'en' ? 'en' : locale === 'pt-BR' ? 'pt' : 'es';
    return service.nameI18n[key] || service.name;
}


export const ServicesService = {
    /**
     * Get all services for a business
     */
    async getServices(businessId: string): Promise<ServiceData[]> {
        try {
            const servicesRef = collection(db, 'businesses', businessId, 'services');
            const snapshot = await getDocs(servicesRef);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ServiceData));
        } catch (error) {
            console.error("Error fetching services:", error);
            return [];
        }
    },

    /**
     * Add a new service
     */
    async addService(businessId: string, service: Omit<ServiceData, 'id'>): Promise<string> {
        try {
            const servicesRef = collection(db, 'businesses', businessId, 'services');
            const docRef = await addDoc(servicesRef, {
                ...service,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
            return docRef.id;
        } catch (error) {
            console.error("Error adding service:", error);
            throw error;
        }
    },

    /**
     * Update a service
     */
    async updateService(businessId: string, serviceId: string, data: Partial<ServiceData>): Promise<void> {
        try {
            const serviceRef = doc(db, 'businesses', businessId, 'services', serviceId);
            await updateDoc(serviceRef, {
                ...data,
                updatedAt: serverTimestamp()
            });
        } catch (error) {
            console.error("Error updating service:", error);
            throw error;
        }
    },

    /**
     * Delete a service
     */
    async deleteService(businessId: string, serviceId: string): Promise<void> {
        try {
            const serviceRef = doc(db, 'businesses', businessId, 'services', serviceId);
            await deleteDoc(serviceRef);
        } catch (error) {
            console.error("Error deleting service:", error);
            throw error;
        }
    }
};

// --- Portfolio Subcollection Types ---
export interface PortfolioItem {
    id?: string;
    url: string;
    description?: string;
    title?: string;
    createdAt?: any;
}

export const PortfolioService = {
    /**
     * Get portfolio items for a business
     */
    async getPortfolio(businessId: string): Promise<PortfolioItem[]> {
        try {
            // We use businesses_public for portfolio to make it easily accessible
            const portfolioRef = collection(db, 'businesses_public', businessId, 'portfolio_posts');

            // Order by createdAt desc
            const q = query(portfolioRef, orderBy('createdAt', 'desc'));

            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any } as PortfolioItem));
        } catch (error) {
            console.error("Error fetching portfolio:", error);
            // Fallback to empty if collection doesn't exist yet
            return [];
        }
    },

    /**
     * Add a new portfolio item
     */
    async addPortfolioItem(businessId: string, item: Omit<PortfolioItem, 'id'>): Promise<string> {
        try {
            const portfolioRef = collection(db, 'businesses_public', businessId, 'portfolio_posts');

            // 1. Add to subcollection
            const docRef = await addDoc(portfolioRef, {
                ...item,
                createdAt: serverTimestamp()
            });

            // 2. Optional: Keep the main doc 'images' array in sync for legacy compatibility
            // We'll append the NEW url to the start of the array, limit to 10
            const publicRef = doc(db, 'businesses_public', businessId);
            const privateRef = doc(db, 'businesses_private', businessId);

            // Use arrayUnion to add. Limiting array size in Firestore is hard atomically without reading.
            // For now, just add. A cloud function would be better to trim.
            // Or we just read-modify-write if we want to be strict.

            // Let's just do arrayUnion for now to ensure it appears in legacy views.
            await updateDoc(publicRef, {
                images: arrayUnion(item.url),
                updatedAt: serverTimestamp()
            });
            await updateDoc(privateRef, {
                gallery: arrayUnion(item.url),
                updatedAt: serverTimestamp()
            });

            return docRef.id;
        } catch (error) {
            console.error("Error adding portfolio item:", error);
            throw error;
        }
    },

    /**
     * Delete a portfolio item
     */
    async deletePortfolioItem(businessId: string, itemId: string, imageUrl: string): Promise<void> {
        try {
            // 1. Delete from subcollection
            const itemRef = doc(db, 'businesses_public', businessId, 'portfolio_posts', itemId);
            await deleteDoc(itemRef);

            // 2. Remove from legacy arrays
            const publicRef = doc(db, 'businesses_public', businessId);
            const privateRef = doc(db, 'businesses_private', businessId);

            await updateDoc(publicRef, {
                images: arrayRemove(imageUrl)
            });
            await updateDoc(privateRef, {
                gallery: arrayRemove(imageUrl)
            });

        } catch (error) {
            console.error("Error deleting portfolio item:", error);
            throw error;
        }
    }
};

// --- Reviews Subcollection Types ---
export interface Review {
    id?: string;
    userId: string;
    userName: string;
    userAvatar?: string;
    rating: number; // 1-5
    comment: string;
    createdAt: any;
    serviceId?: string; // Optional: specific service reviewed
}

export const ReviewsService = {
    /**
     * Get reviews for a business
     */
    async getReviews(businessId: string): Promise<Review[]> {
        try {
            const reviewsRef = collection(db, 'businesses_public', businessId, 'reviews');
            // Order by createdAt desc
            const q = query(reviewsRef, orderBy('createdAt', 'desc'));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Review));
        } catch (error) {
            console.error("Error fetching reviews:", error);
            return [];
        }
    },

    /**
     * Add a new review and update business rating
     */
    async addReview(businessId: string, review: Omit<Review, 'id'>): Promise<string> {
        try {
            const reviewsRef = collection(db, 'businesses_public', businessId, 'reviews');
            const businessRef = doc(db, 'businesses_public', businessId);

            // 1. Add Review Doc
            const docRef = await addDoc(reviewsRef, {
                ...review,
                createdAt: serverTimestamp()
            });

            // 2. Update Aggregates (Rating & Count)
            // We need to read the business doc to get current rating/count
            const businessSnap = await getDoc(businessRef);
            if (businessSnap.exists()) {
                const data = businessSnap.data();
                const currentRating = data.rating || 0; // Default 0 if none
                const currentCount = data.reviewCount || 0;

                // Calculate new average
                // If it's the first real review (maybe we had a default 5.0 with 0 count? Logic in creation says rating: 5.0, count: 0)
                // If count is 0, we can just take the new rating (or average with the initial 5.0 boost? Let's just be real mathematics)
                // If count is 0, let's treat the new rating as the first one, ignoring the "boost" for the average calculation,
                // OR we accept the boost as a "seed".
                // Let's go with: if count is 0, new rating is the rating.

                let newRating = review.rating;
                let newCount = currentCount + 1;

                if (currentCount > 0) {
                    newRating = ((currentRating * currentCount) + review.rating) / newCount;
                }

                // Round to 1 decimal
                newRating = Math.round(newRating * 10) / 10;

                await updateDoc(businessRef, {
                    rating: newRating,
                    reviewCount: newCount
                });
            }

            return docRef.id;
        } catch (error) {
            console.error("Error adding review:", error);
            throw error;
        }
    }
};

export const BusinessProfileService = {
    /**
     * Creates a new business profile with strict data separation.
     */
    async createProfile(userId: string, data: BusinessProfileData) {
        if (!userId) throw new Error('User ID is required');

        // 1. Validate mandatory fields
        if (!data.businessName || !data.category || !data.modality) {
            throw new Error('Faltan datos obligatorios (Nombre, Categoría o Modalidad).');
        }

        const publicRef = doc(db, 'businesses_public', userId);
        const privateRef = doc(db, 'businesses_private', userId);
        const userRef = doc(db, 'users', userId);

        const batch = writeBatch(db);

        try {
            // Build a flat tags array from all specialties across all subcategories
            const allTags = data.subcategories && data.specialtiesBySubcategory
                ? Object.values(data.specialtiesBySubcategory).flat()
                : (data.specialties || []);

            // 2. Prepare location: use exact Google Places coords if available, else geocode
            let location: { lat: number; lng: number };
            if (data.lat && data.lng) {
                location = { lat: data.lat, lng: data.lng };
            } else {
                location = await geocodeAddress(data.city, data.department, data.country, data.address);
            }

            // 3. Prepare Public Payload (Safe for everyone)
            const publicPayload = {
                id: userId,
                name: data.businessName,
                category: data.category,
                subcategory: data.subcategory || (data.subcategories?.[0] ?? ''),
                subcategories: data.subcategories || (data.subcategory ? [data.subcategory] : []),
                specialtiesBySubcategory: data.specialtiesBySubcategory || {},
                additionalCategories: data.additionalCategories || [],
                additionalSpecialties: data.additionalSpecialties || [],
                city: data.city || '',
                department: data.department || '',
                country: data.country || 'HN',
                tags: allTags,
                rating: 0,
                reviewCount: 0,
                coverImage: data.images[0] || null,
                shortDescription: data.description.substring(0, 150),
                website: data.website || '',
                phone: data.phone || '',
                socialMedia: data.socialMedia || { instagram: '', facebook: '', tiktok: '' },
                location,
                placeId: data.placeId || null,
                googleMapsUrl: data.googleMapsUrl || null,
                modality: data.modality,
                status: 'active',
                openingHours: data.openingHours || null,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            };

            // 3. Prepare Private Payload (Sensitive info)
            const privatePayload = {
                id: userId,
                fullDescription: data.description,
                email: data.email,
                phone: data.phone || '',
                address: data.address || '',
                department: data.department || '', // Also save in private for querying ease if needed
                gallery: data.images || [],
                socialMedia: data.socialMedia || { instagram: '', facebook: '', tiktok: '' },
                verificationStatus: 'pending',
                updatedAt: serverTimestamp()
            };

            // 4. Batch Writes
            batch.set(publicRef, publicPayload);
            batch.set(privateRef, privatePayload);
            batch.update(userRef, {
                isProvider: true,
                currentRole: 'provider',
                businessProfileId: userId, // Link business to user for BusinessGuard
                providerSince: serverTimestamp()
            });

            // 5. Write trial plan data to businesses doc (gated plan management)
            const businessesRef = doc(db, 'businesses', userId);
            const trialPlanData = TrialService.getNewBusinessPlanData();
            batch.set(businessesRef, {
                planData: trialPlanData,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            }, { merge: true });

            await batch.commit();

            return { success: true, id: userId };
        } catch (error: any) {
            console.error('Error creating business profile:', error);
            throw new Error(error.message || 'Error al crear el perfil.');
        }
    },


    /**
     * Fetches all active businesses from PUBLIC collection.
     */
    async getPublicBusinesses(countryCode?: string) {
        try {
            const { collection, getDocs, query, where } = await import('firebase/firestore');

            // Fetch all businesses — status filtering is done client-side so that
            // businesses without a 'status' field (created before the field was added)
            // are still visible. Only 'suspended' businesses are hidden.
            let q = query(collection(db, 'businesses_public'));

            if (countryCode && countryCode !== 'ALL' && countryCode !== 'GLOBAL') {
                q = query(collection(db, 'businesses_public'), where('countryCode', '==', countryCode));

                // Note: Older documents might not have 'countryCode' indexed or populated. 
                // We will fall back to filtering in memory for safety if the query doesn't match effectively yet.
            }

            const querySnapshot = await getDocs(q);

            return querySnapshot.docs
                .map(doc => {
                    const data = doc.data();
                    const fb = getLocationFallback(data.department, data.country);
                    return {
                        id: doc.id,
                        ...data,
                        // Normalize country field: handles full names ('Honduras') and codes ('HN')
                        countryCode: (() => {
                            const COUNTRY_MAP: Record<string, string> = {
                                'Honduras': 'HN', 'México': 'MX', 'Mexico': 'MX',
                                'Guatemala': 'GT', 'El Salvador': 'SV', 'Nicaragua': 'NI',
                                'Costa Rica': 'CR', 'Panamá': 'PA', 'Panama': 'PA',
                                'Colombia': 'CO', 'Venezuela': 'VE', 'Perú': 'PE', 'Peru': 'PE',
                                'Brasil': 'BR', 'Brazil': 'BR', 'Argentina': 'AR', 'Chile': 'CL',
                                'España': 'ES', 'Spain': 'ES',
                            };
                            const raw = data.countryCode || data.country || 'HN';
                            return raw.length === 2 ? raw.toUpperCase() : (COUNTRY_MAP[raw] || raw);
                        })(),
                        // Use stored location if valid, otherwise fall back to department/country coords
                        lat: (data.location?.lat && data.location.lat !== 0) ? data.location.lat
                            : (data.lat && data.lat !== 0) ? data.lat : fb.lat,
                        lng: (data.location?.lng && data.location.lng !== 0) ? data.location.lng
                            : (data.lng && data.lng !== 0) ? data.lng : fb.lng,
                        // Keep emoji icon as fallback; real logo is in logoUrl
                        icon: '💼',
                        logoUrl: data.logoUrl || null, // Real business photo from Firebase Storage
                        color: 'bg-blue-500',
                        description: data.shortDescription || ''
                    } as any;
                })
                .filter(biz => {
                    // Client-side: only hide explicitly suspended businesses
                    if (biz.status === 'suspended') return false;

                    // If a country parameter was provided, do an extra memory pass to ensure 
                    // older documents without 'countryCode' properly formatted are still caught
                    if (countryCode && countryCode !== 'ALL' && countryCode !== 'GLOBAL') {
                        return biz.countryCode === countryCode;
                    }
                    return true;
                });

        } catch (error) {
            console.error("Error fetching public businesses:", error);
            return [];
        }
    },

    async getPublicBusinessById(id: string) {
        // 1. Strict Mock Check: Only use mocks if flag is explicitly set
        if (process.env.NEXT_PUBLIC_USE_MOCKS === 'true') {
            try {
                const { DEMO_BUSINESSES } = await import('@/data/mockBusinesses');
                const mockBiz = DEMO_BUSINESSES.find(b => b.id === id);
                if (mockBiz) {
                    console.log(`[DEV MODE] Returning mock business for id: ${id}`);
                    return {
                        ...mockBiz,
                        rating: 5.0,
                        reviewCount: 120,
                        coverImage: null,
                        shortDescription: mockBiz.description,
                        fullDescription: mockBiz.description + " (MOCK DATA)",
                        phone: "+504 9999-9999",
                        email: "moch@dev.com",
                        gallery: [],
                        website: "https://mock-business.dev"
                    };
                }
            } catch (e) {
                console.warn("Failed to load mock data in dev mode", e);
            }
        }

        try {
            const docRef = doc(db, 'businesses_public', id);
            const snap = await getDoc(docRef);

            if (snap.exists()) {
                const data = snap.data();
                return {
                    id: snap.id,
                    ...data,
                    // Ensure these fields exist or are consistent
                    website: data.website || '',
                    gallery: data.gallery || [], // Map if needed, but usually images/gallery
                    description: data.shortDescription || data.description || ''
                };
            }

            return null;
        } catch (error) {
            console.error("Error fetching business public:", error);
            throw error; // Propagate error to let UI handle "Retry"
        }
    },

    async getPrivateBusinessData(id: string) {
        try {
            const docRef = doc(db, 'businesses_private', id);
            const snap = await getDoc(docRef);
            return snap.exists() ? snap.data() : null;
        } catch (error) {
            // Permission denied if not auth, handled by Security Rules ideally
            console.error("Error fetching business private:", error);
            return null;
        }
    },

    /**
     * Get full profile for editing (combines public and private)
     */
    async getProfile(userId: string): Promise<Partial<BusinessProfileData> | null> {
        try {
            const publicRef = doc(db, 'businesses_public', userId);
            const privateRef = doc(db, 'businesses_private', userId);

            const [publicSnap, privateSnap] = await Promise.all([
                getDoc(publicRef),
                getDoc(privateRef)
            ]);

            if (!publicSnap.exists()) return null;

            const publicData = publicSnap.data();
            const privateData = privateSnap.exists() ? privateSnap.data() : {};

            // Map back to BusinessProfileData structure
            return {
                userId,
                businessName: publicData.name,
                category: publicData.category,
                subcategory: publicData.subcategory || (publicData.subcategories?.[0] ?? ''),
                subcategories: publicData.subcategories || (publicData.subcategory ? [publicData.subcategory] : []),
                specialtiesBySubcategory: publicData.specialtiesBySubcategory || {},
                additionalCategories: publicData.additionalCategories || [],
                additionalSpecialties: publicData.additionalSpecialties || [],
                specialties: publicData.tags || [],
                city: publicData.city,
                department: publicData.department,
                country: publicData.country,
                modality: publicData.modality,
                description: privateData.fullDescription || publicData.shortDescription,
                phone: privateData.phone || '',
                email: privateData.email || '',
                address: privateData.address || '',
                website: publicData.website || '',
                socialMedia: privateData.socialMedia || { instagram: '', facebook: '', tiktok: '' },
                images: privateData.gallery || (publicData.coverImage ? [publicData.coverImage] : []),
                coverImage: publicData.coverImage,
                logoUrl: publicData.logoUrl,
                openingHours: publicData.openingHours || undefined,
                paymentSettings: privateData.paymentSettings || undefined,
                // Exact coordinates from Google Places (or stored location object as fallback)
                lat: publicData.lat ?? publicData.location?.lat,
                lng: publicData.lng ?? publicData.location?.lng,
                placeId: publicData.placeId || undefined,
                googleMapsUrl: publicData.googleMapsUrl || undefined,
            };
        } catch (error) {
            console.error("Error getting profile:", error);
            return null;
        }
    },

    /**
     * Update full profile
     */
    async updateProfile(userId: string, data: Partial<BusinessProfileData>) {
        const publicRef = doc(db, 'businesses_public', userId);
        const privateRef = doc(db, 'businesses_private', userId);
        const batch = writeBatch(db);

        // Prepare updates (only define fields that are present in data)
        const publicUpdate: any = { updatedAt: serverTimestamp() };
        const privateUpdate: any = { updatedAt: serverTimestamp() };

        if (data.businessName) publicUpdate.name = data.businessName;
        if (data.category) publicUpdate.category = data.category;
        if (data.subcategories !== undefined) {
            publicUpdate.subcategories = data.subcategories;
            // Keep legacy field in sync with first subcategory
            publicUpdate.subcategory = data.subcategories[0] || '';
        } else if (data.subcategory) {
            publicUpdate.subcategory = data.subcategory;
            publicUpdate.subcategories = [data.subcategory];
        }
        if (data.specialtiesBySubcategory !== undefined) {
            publicUpdate.specialtiesBySubcategory = data.specialtiesBySubcategory;
            // Rebuild flat tags from all subcategory specialties
            publicUpdate.tags = Object.values(data.specialtiesBySubcategory).flat();
        } else if (data.specialties) {
            publicUpdate.tags = data.specialties;
        }
        if (data.additionalCategories) publicUpdate.additionalCategories = data.additionalCategories;
        if (data.additionalSpecialties) publicUpdate.additionalSpecialties = data.additionalSpecialties;
        if (data.city) publicUpdate.city = data.city;
        if (data.department) publicUpdate.department = data.department;
        if (data.country) publicUpdate.country = data.country;
        if (data.modality) publicUpdate.modality = data.modality;
        if (data.description) {
            publicUpdate.shortDescription = data.description.substring(0, 150);
            privateUpdate.fullDescription = data.description;
        }
        if (data.website !== undefined) publicUpdate.website = data.website;
        if (data.phone !== undefined) publicUpdate.phone = data.phone;
        if (data.socialMedia !== undefined) publicUpdate.socialMedia = data.socialMedia;
        if (data.openingHours) publicUpdate.openingHours = data.openingHours;

        // Handle images
        if (data.images) {
            if (!data.coverImage) publicUpdate.coverImage = data.images[0] || null;
            privateUpdate.gallery = data.images;
        }

        if (data.coverImage) publicUpdate.coverImage = data.coverImage;
        if (data.logoUrl) publicUpdate.logoUrl = data.logoUrl;

        if (data.email) privateUpdate.email = data.email;
        if (data.phone) privateUpdate.phone = data.phone;
        if (data.address) privateUpdate.address = data.address;
        if (data.socialMedia !== undefined) privateUpdate.socialMedia = data.socialMedia;
        if (data.department) privateUpdate.department = data.department;

        // ── Location update ──────────────────────────────────────────────────
        // Priority 1: Exact GPS coords from Google Places (lat/lng provided directly)
        if (data.lat && data.lng) {
            publicUpdate.location = { lat: data.lat, lng: data.lng };
            publicUpdate.lat = data.lat;
            publicUpdate.lng = data.lng;
            if (data.placeId !== undefined) publicUpdate.placeId = data.placeId;
            if (data.googleMapsUrl !== undefined) publicUpdate.googleMapsUrl = data.googleMapsUrl;
        }
        // Priority 2: Re-geocode with Nominatim only if no exact coords provided
        else if (data.city || data.department || data.address || data.country) {
            try {
                // Read current public data to fill missing location fields
                const currentSnap = await getDoc(publicRef);
                const current = currentSnap.exists() ? currentSnap.data() : {};

                const city = data.city || current.city || '';
                const department = data.department || current.department || '';
                const country = data.country || current.country || 'HN';
                const address = data.address || current.address || '';

                // Build the most precise query: address + city + department + country
                const parts = [address, city, department, country].filter(Boolean);
                const q = parts.join(', ');
                const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`;
                const res = await fetch(url, {
                    headers: { 'User-Agent': 'PRO247CRM/1.0 (admin@pro247.app)' }
                });
                const json = await res.json();
                if (json?.[0]) {
                    publicUpdate.location = {
                        lat: parseFloat(json[0].lat),
                        lng: parseFloat(json[0].lon)
                    };
                }
            } catch {
                // Silently skip geocoding on error — existing coords are preserved
            }
        }
        // ──────────────────────────────────────────────────────────────────

        batch.update(publicRef, publicUpdate);
        batch.update(privateRef, privateUpdate);

        await batch.commit();
    },


    /**
     * Set a specific image as the cover image
     */
    async setAsCover(userId: string, imageUrl: string) {
        const publicRef = doc(db, 'businesses_public', userId);
        await updateDoc(publicRef, {
            coverImage: imageUrl,
            updatedAt: serverTimestamp()
        });
    },

    /**
     * Set a specific image as the logo/profile image
     */
    async setAsLogo(userId: string, imageUrl: string) {
        const publicRef = doc(db, 'businesses_public', userId);
        await updateDoc(publicRef, {
            logoUrl: imageUrl,
            updatedAt: serverTimestamp()
        });
    },

    /**
     * Update Payment Settings (Private Collection)
     */
    async updatePaymentSettings(businessId: string, settings: PaymentSettings) {
        try {
            const privateRef = doc(db, 'businesses_private', businessId);
            const publicRef = doc(db, 'businesses_public', businessId);
            const batch = writeBatch(db);

            // 1. Save FULL settings to Private (set+merge: works on new and existing docs)
            batch.set(privateRef, {
                paymentSettings: settings,
                updatedAt: serverTimestamp()
            }, { merge: true });

            // 2. Sync DISPLAY settings to Public (set+merge avoids error if field didn't exist)
            batch.set(publicRef, {
                paymentSettings: settings,
                updatedAt: serverTimestamp()
            }, { merge: true });

            await batch.commit();
        } catch (error) {
            console.error("Error updating payment settings:", error);
            throw error;
        }
    }
};
