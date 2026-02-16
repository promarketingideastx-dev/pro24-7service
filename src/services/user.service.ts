import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { UserDocument } from '@/types/firestore-schema';

export const UserService = {
    /**
     * Creates a base user profile in Firestore idempotently.
     * Uses setDoc with merge: true to avoid reading (getDoc) which fails offline.
     */
    async createUserProfile(uid: string, email: string) {
        if (!uid) return;

        const userRef = doc(db, 'users', uid);

        // Define default values
        const defaultUser: Partial<UserDocument> = {
            uid,
            email,
            roles: {
                client: false,
                provider: false,
                admin: false
            },
            createdAt: serverTimestamp() as any,
            lastLogin: serverTimestamp() as any,
            country_code: 'HN',
            locale: 'es',
            settings: {
                unit_km_mi: 'km',
                notifications_enabled: true
            },
            clientProfile: {
                fullName: '',
                avatar: { type: 'none' },
                privacy_policy_accepted: false,
                updated_at: new Date().toISOString()
            },
            isBusinessActive: false
        };

        // Use setDoc with merge to create if missing, or update if exists.
        // This works even if client is offline (writes are queued).
        await setDoc(userRef, defaultUser, { merge: true });

        return defaultUser as UserDocument;
    },

    /**
     * Gets the full user profile from Firestore.
     */
    async getUserProfile(uid: string) {
        if (!uid) return null;
        try {
            const userRef = doc(db, 'users', uid);
            const userSnap = await getDoc(userRef);
            return userSnap.exists() ? (userSnap.data() as UserDocument) : null;
        } catch (error) {
            console.error('Error fetching user profile:', error);
            return null;
        }
    },

    /**
     * Updates the user's role (e.g., becoming a provider).
     * Uses setDoc with merge to avoid dependency on document existence check.
     */
    async setUserRole(uid: string, role: 'client' | 'provider') {
        if (!uid) throw new Error('User ID required');

        const userRef = doc(db, 'users', uid);

        if (role === 'provider') {
            await setDoc(userRef, {
                roles: { provider: true },
                isBusinessActive: false
            }, { merge: true });
        } else if (role === 'client') {
            await setDoc(userRef, {
                roles: { client: true }
            }, { merge: true });
        }
    }
};
