import { db, storage } from '@/lib/firebase';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { sanitizeData, withTimeout } from '@/lib/firestoreUtils';
import { BusinessDocument, UserDocument } from '@/types/firestore-schema';

const COLLECTION = 'businesses';

export const BusinessProfileService = {
    /**
     * Crea un perfil de negocio vinculado al usuario.
     * Maneja la transacción de crear el documento 'businesses/{uid}' 
     * y actualizar 'users/{uid}' con el rol 'provider'.
     */
    createProfile: async (user: UserDocument, data: any) => {
        if (!user || !user.uid) throw new Error('Usuario no autenticado');

        // 1. Preparar Payload limpio
        const businessPayload: BusinessDocument = {
            uid: user.uid,
            slug: data.slug || data.brandName.toLowerCase().replace(/\s+/g, '-'),
            displayName: data.brandName,
            category: {
                main: data.category,
                sub: data.subcategory,
                specialties: data.specialties || []
            },
            contact: {
                phone: data.phone, // Privado por defecto según reglas
                email: user.email,
                isPhonePublic: false
            },
            location: {
                address: data.address || '',
                lat: data.lat || 0,
                lng: data.lng || 0,
                coverageRadius: data.coverage || 10
            },
            media: {
                logoUrl: data.logoUrl || '',
                coverPhotos: data.coverPhotos || []
            },
            stats: {
                rating: 5.0, // Start with 5 stars? Or 0? Booksy starts new. Let's say 0 or new.
                reviewCount: 0,
                views: 0
            },
            metadata: {
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                status: 'active',
                plan: 'standard'
            }
        };

        const cleanBusiness = sanitizeData(businessPayload);

        // 2. Guardar en Firestore (Batch o escritura atómica)
        const businessRef = doc(db, COLLECTION, user.uid);
        const userRef = doc(db, 'users', user.uid);

        await withTimeout(
            Promise.all([
                setDoc(businessRef, cleanBusiness),
                updateDoc(userRef, {
                    'roles.provider': true,
                    'roles.currentRole': 'provider' // Switch to business view immediately
                })
            ]),
            15000,
            'Error al crear el perfil de negocio.'
        );

        return cleanBusiness;
    },

    /**
     * Sube múltiples fotos al portafolio del negocio
     */
    uploadPortfolioPhotos: async (uid: string, files: File[]) => {
        const urls: string[] = [];
        for (const file of files) {
            const path = `business/${uid}/portfolio/${Date.now()}_${file.name}`;
            const storageRef = ref(storage, path);
            await uploadBytes(storageRef, file);
            const url = await getDownloadURL(storageRef);
            urls.push(url);
        }
        return urls;
    }
};
