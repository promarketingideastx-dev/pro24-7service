import { db } from '@/lib/firebase';
import { doc, setDoc, getDoc, collection, getDocs, addDoc, updateDoc, deleteDoc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { WeeklySchedule } from './employee.service';

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
    userId: string;
    email: string;
    phone?: string;
    website?: string;
    openingHours?: WeeklySchedule;
}

// --- Services Subcollection Types ---
export interface ServiceData {
    id?: string;
    name: string;
    description?: string;
    price: number;
    durationMinutes?: number;
    currency: string;
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
                location: {
                    lat: 15.50417 + (Math.random() - 0.5) * 0.02, // Mock Geocoding
                    lng: -88.02500 + (Math.random() - 0.5) * 0.02
                },
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
                images: privateData.gallery || (publicData.coverImage ? [publicData.coverImage] : []),
                openingHours: publicData.openingHours || undefined
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
        if (data.openingHours) publicUpdate.openingHours = data.openingHours;

        // Handle images
        if (data.images) {
            publicUpdate.coverImage = data.images[0] || null;
            privateUpdate.gallery = data.images;
        }

        if (data.email) privateUpdate.email = data.email;
        if (data.phone) privateUpdate.phone = data.phone;
        if (data.address) privateUpdate.address = data.address;

        // Also update private department if present
        if (data.department) privateUpdate.department = data.department;

        batch.update(publicRef, publicUpdate);

        // Check if private doc exists, if not set it, else update
        // Simple approach: we assume it exists if public exists, but safer to update
        batch.update(privateRef, privateUpdate);

        await batch.commit();
    }
};
