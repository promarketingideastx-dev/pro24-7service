
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

export interface BusinessProfileData {
    businessName: string;
    description: string;
    category: string;
    subcategory: string;
    specialties: string[];
    modality: 'home' | 'local' | 'both';
    address?: string;
    images: string[];
    userId: string;
    email: string;
    phone?: string;
}

export const BusinessProfileService = {
    /**
     * Creates a new business profile for the user.
     */
    async createProfile(userId: string, data: BusinessProfileData) {
        if (!userId) throw new Error('User ID is required');

        // 1. Validate mandatory fields
        if (!data.businessName || !data.category || !data.modality) {
            throw new Error('Faltan datos obligatorios (Nombre, Categoría o Modalidad).');
        }

        const businessRef = doc(db, 'businesses', userId);
        const userRef = doc(db, 'users', userId);

        try {
            // 2. check if profile already exists
            const docSnap = await getDoc(businessRef);
            if (docSnap.exists()) {
                throw new Error('El perfil de negocio ya existe.');
            }

            // 3. Prepare payload
            const payload = {
                ...data,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                status: 'active',
                rating: 0,
                reviewCount: 0,
                verified: false
            };

            // 4. Save to Firestore (Batch not strictly necessary for 2 writes, but good practice)
            // Writing simply with promises here
            await setDoc(businessRef, payload);

            // 5. Update User Role
            await updateDoc(userRef, {
                isProvider: true,
                currentRole: 'provider',
                providerSince: serverTimestamp()
            });

            return { success: true, id: userId };
        } catch (error: any) {
            console.error('Error creating business profile:', error);
            throw new Error(error.message || 'Error al crear el perfil.');
        }
    }
};
