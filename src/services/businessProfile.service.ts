import { db } from '@/lib/firebase';
import { doc, setDoc, getDoc, collection, getDocs, addDoc, updateDoc, deleteDoc, writeBatch, serverTimestamp, query, orderBy, arrayUnion, arrayRemove } from 'firebase/firestore';
import { WeeklySchedule } from './employee.service';
import { PaymentSettings } from '@/types/firestore-schema';

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

/**
 * Geocode a city/state/country to lat/lng using OpenStreetMap Nominatim.
 * Free, no API key required. Returns country centroid as fallback.
 */
async function geocodeAddress(
    city?: string, state?: string, country?: string
): Promise<{ lat: number; lng: number }> {
    const fallback = COUNTRY_COORDS[country ?? 'HN'] ?? { lat: 14.9, lng: -87.2 };
    try {
        const parts = [city, state, country].filter(Boolean).join(', ');
        if (!parts) return fallback;
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(parts)}&format=json&limit=1`;
        const res = await fetch(url, {
            headers: { 'User-Agent': 'PRO247CRM/1.0 (admin@pro247.app)' },
        });
        const json = await res.json();
        if (json?.[0]) {
            return { lat: parseFloat(json[0].lat), lng: parseFloat(json[0].lon) };
        }
    } catch {
        // Silently fallback
    }
    return fallback;
}


export interface BusinessProfileData {
    businessName: string;
    description: string;
    category: string;
    subcategory: string;
    specialties: string[];
    additionalCategories?: string[]; // New: Multi-select areas
    additionalSpecialties?: string[]; // New: Multi-select specialties
    modality: 'home' | 'local' | 'both';
    address?: string;
    city?: string;
    department: string; // Added Department
    country?: string;
    images: string[];
    coverImage?: string; // New: Header image
    logoUrl?: string; // New: Avatar/Logo
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
    name: string;
    description?: string;
    price: number;
    durationMinutes: number;   // Duration in minutes (required for scheduling)
    currency: string;
    category?: string;         // Tied to business specialty
    isExtra?: boolean;         // Add-on service (optional when booking)
    isActive?: boolean;        // Can be toggled off without deleting
    createdAt?: any;
    updatedAt?: any;
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
            // 2. Prepare Public Payload (Safe for everyone)
            const publicPayload = {
                id: userId,
                name: data.businessName,
                category: data.category, // Primary
                subcategory: data.subcategory, // Primary
                additionalCategories: data.additionalCategories || [], // New
                additionalSpecialties: data.additionalSpecialties || [], // New
                city: data.city || 'San Pedro Sula', // Default for now
                department: data.department || 'Cortés',
                country: data.country || 'HN',
                tags: data.specialties || [], // Primary Specialties
                rating: 5.0, // Initial boost
                reviewCount: 0,
                coverImage: data.images[0] || null, // First image as cover
                shortDescription: data.description.substring(0, 150),
                website: data.website || '', // Added website
                phone: data.phone || '', // Public phone for contact
                socialMedia: data.socialMedia || { instagram: '', facebook: '', tiktok: '' },
                location: await geocodeAddress(data.city, data.department, data.country),
                modality: data.modality,
                status: 'active',
                openingHours: data.openingHours || null, // Shared
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

            // Basic query - in prod, use compound queries or Algolia
            let q = query(
                collection(db, 'businesses_public'),
                where('status', '==', 'active')
            );

            if (countryCode) {
                // Note: Requires composite index if combined with status. 
                // For now, filter client side if index missing, or assume country is enough.
                q = query(q, where('country', '==', countryCode));
            }

            const querySnapshot = await getDocs(q);

            return querySnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    // Ensure lat/lng exist for map
                    lat: data.location?.lat || 15.50417,
                    lng: data.location?.lng || -88.02500,
                    icon: '💼', // Can map category to icon here
                    color: 'bg-blue-500',
                    description: data.shortDescription || ''
                } as any;
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
                subcategory: publicData.subcategory,
                additionalCategories: publicData.additionalCategories || [],
                additionalSpecialties: publicData.additionalSpecialties || [],
                specialties: publicData.tags || [],
                city: publicData.city,
                department: publicData.department,
                country: publicData.country,
                modality: publicData.modality,
                description: privateData.fullDescription || publicData.shortDescription, // Prefer full
                phone: privateData.phone || '',
                email: privateData.email || '',
                address: privateData.address || '',
                website: publicData.website || '',
                socialMedia: privateData.socialMedia || { instagram: '', facebook: '', tiktok: '' },
                images: privateData.gallery || (publicData.coverImage ? [publicData.coverImage] : []),
                coverImage: publicData.coverImage,
                logoUrl: publicData.logoUrl,
                openingHours: publicData.openingHours || undefined,
                paymentSettings: privateData.paymentSettings || undefined
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
        if (data.subcategory) publicUpdate.subcategory = data.subcategory;
        if (data.additionalCategories) publicUpdate.additionalCategories = data.additionalCategories;
        if (data.additionalSpecialties) publicUpdate.additionalSpecialties = data.additionalSpecialties;
        if (data.specialties) publicUpdate.tags = data.specialties;
        if (data.city) publicUpdate.city = data.city;
        if (data.department) publicUpdate.department = data.department;
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
            // Only update cover frame if not explicitly set
            if (!data.coverImage) publicUpdate.coverImage = data.images[0] || null;
            privateUpdate.gallery = data.images;
        }

        if (data.coverImage) publicUpdate.coverImage = data.coverImage;
        if (data.logoUrl) publicUpdate.logoUrl = data.logoUrl;

        if (data.email) privateUpdate.email = data.email;
        if (data.phone) privateUpdate.phone = data.phone;
        if (data.address) privateUpdate.address = data.address;
        if (data.socialMedia !== undefined) privateUpdate.socialMedia = data.socialMedia;

        // Also update private department if present
        if (data.department) privateUpdate.department = data.department;

        batch.update(publicRef, publicUpdate);

        // Check if private doc exists, if not set it, else update
        // Simple approach: we assume it exists if public exists, but safer to update
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

            // 1. Save FULL settings to Private
            batch.set(privateRef, {
                paymentSettings: settings,
                updatedAt: serverTimestamp()
            }, { merge: true });

            // 2. Sync DISPLAY settings to Public (Safe to expose)
            batch.update(publicRef, {
                paymentSettings: settings, // We expose all for now as Client needs to see Account Numbers to pay
                updatedAt: serverTimestamp()
            });

            await batch.commit();
        } catch (error) {
            console.error("Error updating payment settings:", error);
            throw error;
        }
    }
};
