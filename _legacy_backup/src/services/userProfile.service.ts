import { db, storage } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { compressImage } from '@/lib/imageUtils';
import { sanitizeData, withTimeout } from '@/lib/firestoreUtils';
import { ClientProfile } from '@/types/firestore-schema';

export type SaveResult = 'success' | 'offline_success';

/**
 * Servicio robusto para actualizar perfiles de usuario (Cliente).
 * Cumple con: No undefined, Timeout, Persistencia Offline.
 */
export const UserProfileService = {

    /**
     * Sube el avatar y actualiza el documento del usuario en Firestore.
     */
    async updateClientProfile(userId: string, currentData: any, newData: Partial<ClientProfile>, newAvatarFile: File | null): Promise<SaveResult> {
        let finalAvatar = currentData.clientProfile?.avatar || { type: 'none' };

        // 1. Manejo de Avatar (Solo si hay archivo nuevo)
        if (newAvatarFile) {
            console.log('[UserProfileService] Optimizing avatar...');
            try {
                const optimizedBlob = await withTimeout(
                    compressImage(newAvatarFile),
                    10000,
                    'COMPRESS_TIMEOUT'
                ).catch(err => {
                    console.warn('Compression failed, using original:', err);
                    return newAvatarFile;
                });

                const path = `avatars/${userId}/${Date.now()}.webp`;
                const storageRef = ref(storage, path);

                console.log('[UserProfileService] Uploading avatar...');
                await withTimeout(
                    uploadBytes(storageRef, optimizedBlob),
                    60000,
                    'UPLOAD_TIMEOUT'
                );

                const url = await getDownloadURL(storageRef);
                finalAvatar = {
                    type: 'photo',
                    photo_url: url,
                    photo_path: path,
                    updated_at: new Date().toISOString()
                };

            } catch (error: any) {
                console.error('[UserProfileService] Avatar Error:', error);
                // Si falla la imagen, permitimos guardar el resto de datos, pero avisamos.
            }
        } else if (newData.avatar) {
            // Handle emoji or removal updates passed in newData
            finalAvatar = newData.avatar;
        }

        // 2. Preparar Payload Estricto
        const clientProfileUpdate: ClientProfile = {
            fullName: newData.fullName || currentData.clientProfile?.fullName || 'Usuario',
            avatar: finalAvatar,
            phone: newData.phone || null,
            favorites: currentData.clientProfile?.favorites || [],
            marketing_opt_in: newData.marketing_opt_in ?? currentData.clientProfile?.marketing_opt_in ?? false,
            privacy_policy_accepted: true,
            updated_at: new Date().toISOString()
        };

        // Root User Fields Update (para i18n y settings)
        // cast to any for newData to access root props passed loosely
        const rootUpdate = {
            country_code: (newData as any).countryCode || currentData.country_code || 'US',
            locale: (newData as any).localePref || currentData.locale || 'es',
            settings: {
                unit_km_mi: (newData as any).units || currentData.settings?.unit_km_mi || 'km'
            }
        };

        // Combinamos todo en un objeto para el sanitizer
        const fullPayload = {
            clientProfile: clientProfileUpdate,
            ...rootUpdate
        };

        // 3. Sanitización CRÍTICA (Recursiva)
        console.log('[UserProfileService] Sanitizing payload...');
        const cleanPayload = sanitizeData(fullPayload);

        // 4. Guardar en Firestore
        const userRef = doc(db, 'users', userId);
        console.log('[UserProfileService] Saving to Firestore:', cleanPayload);

        try {
            await withTimeout(
                setDoc(userRef, cleanPayload, { merge: true }),
                5000, // 5s timeout
                'WRITE_TIMEOUT'
            );
            return 'success';
        } catch (err: any) {
            if (err.message === 'WRITE_TIMEOUT') {
                console.warn('[UserProfileService] Firestore write timed out. Assuming offline persistence.');
                return 'offline_success';
            }
            throw err;
        }
    }
};
