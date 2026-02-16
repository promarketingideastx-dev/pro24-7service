import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { UserDocument } from '@/types/firestore-schema';
import { sanitizeData } from '@/lib/firestoreUtils';

export const migrateUserToV2 = async (uid: string): Promise<UserDocument | null> => {
    try {
        const userRef = doc(db, 'users', uid);
        const snapshot = await getDoc(userRef);

        if (!snapshot.exists()) return null;

        const data = snapshot.data();

        // Check if already migrated (has clientProfile structure)
        if (data.clientProfile && data.roles) {
            return data as UserDocument;
        }

        console.log('[MIGRATION] Migrating user to V2 structure...', uid);

        // Map Legacy Fields -> New Structure
        const newStructure: Partial<UserDocument> = {
            uid: uid,
            email: data.email || '',
            roles: {
                client: true, // Default to client
                provider: !!(data.provider_setup || data.isProvider),
                admin: !!data.isAdmin
            },
            country_code: data.country_code || 'US',
            locale: data.settings?.locale || 'es',
            settings: {
                unit_km_mi: data.settings?.unit_km_mi || 'km'
            },
            clientProfile: {
                fullName: data.full_name || data.displayName || 'Usuario',
                avatar: data.avatar || { type: 'none' },
                phone: data.phone || null,
                favorites: data.favorites || [],
                marketing_opt_in: data.consent?.marketing_opt_in || false,
                privacy_policy_accepted: true,
                updated_at: new Date().toISOString()
            },
            businessProfileId: null, // To be linked if provider
            isBusinessActive: false
        };

        const cleanData = sanitizeData(newStructure);

        // Atomic migration write
        await setDoc(userRef, cleanData, { merge: true });

        console.log('[MIGRATION] Success');
        return cleanData as UserDocument;

    } catch (error) {
        console.error('[MIGRATION] Failed', error);
        return null; // Should treat as error or fallback
    }
};
