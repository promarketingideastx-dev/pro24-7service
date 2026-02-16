import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, writeBatch } from 'firebase/firestore';

export interface BusinessProfileData {
    businessName: string;
    description: string;
    category: string;
    subcategory: string;
    specialties: string[];
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
}

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
                category: data.category,
                subcategory: data.subcategory,
                city: data.city || 'San Pedro Sula', // Default for now
                department: data.department || 'Cortés',
                country: data.country || 'HN',
                tags: data.specialties || [],
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
        try {
            const docRef = doc(db, 'businesses_public', id);

            // OPTIMIZATION: Race condition to prevent hanging on Vercel cold starts.
            // If Firestore takes > 2.5s, we force a fallback to Mock Data immediately.
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Firestore timeout")), 2500)
            );

            const snap = await Promise.race([
                getDoc(docRef),
                timeoutPromise
            ]) as any; // Type assertion to handle the race result

            if (snap.exists()) {
                return { id: snap.id, ...snap.data() };
            }

            // Explicitly throw if not found to trigger fallback logic below
            // ...but the logic below handles "if not returned". 
            // Actually, if snap doesn't exist, we just continue.
            // But if we return here, we exit.
            // If we don't return, we fall through to Mock Data logic?
            // Original code:
            // if (snap.exists()) { return ... }
            // // Fallback to Mock Data...
            // Perfect. The flow continues.
            const { DEMO_BUSINESSES } = await import('@/data/mockBusinesses');
            const mockBiz = DEMO_BUSINESSES.find(b => b.id === id);

            if (mockBiz) {
                return {
                    ...mockBiz,
                    rating: 5.0,
                    reviewCount: 120,
                    coverImage: null, // Mocks don't have covers yet
                    shortDescription: mockBiz.description,
                    fullDescription: mockBiz.description + " (Descripción detallada simulada del negocio).",
                    phone: "+504 9999-9999",
                    email: "contacto@demo.com",
                    gallery: []
                };
            }

            return null;
        } catch (error) {
            console.error("Error fetching business public:", error);
            // Even on error, try mock
            try {
                const { DEMO_BUSINESSES } = await import('@/data/mockBusinesses');
                const mockBiz = DEMO_BUSINESSES.find(b => b.id === id);
                if (mockBiz) {
                    return {
                        ...mockBiz,
                        rating: 5.0,
                        reviewCount: 10,
                        coverImage: null,
                        shortDescription: mockBiz.description,
                        fullDescription: mockBiz.description + " (Modo Offline/Error)",
                        phone: "+504 9999-9999",
                        email: "error@demo.com",
                        gallery: []
                    };
                }
            } catch (e) {
                console.error("Mock fallback failed", e);
            }
            return null;
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
    }
};
