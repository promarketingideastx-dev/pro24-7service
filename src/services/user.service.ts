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

        try {
            // First check if user exists. 
            // This prevents overwriting roles or settings if the user logs in again.
            const snap = await getDoc(userRef);

            if (snap.exists()) {
                return snap.data() as UserDocument;
            }

            // Define default values ONLY for totally new users
            const defaultUser: Partial<UserDocument> = {
                uid,
                email,
                roles: {
                    client: false,
                    provider: false,
                    admin: false
                },
                role: null, // Initialize primary role as null
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

            await setDoc(userRef, defaultUser);
            return defaultUser as UserDocument;
        } catch (error) {
            console.error('Error creating user profile:', error);
            return null;
        }
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
                role: 'provider',
                roles: { provider: true },
                isBusinessActive: false
            }, { merge: true });
        } else if (role === 'client') {
            await setDoc(userRef, {
                role: 'client',
                roles: { client: true }
            }, { merge: true });
        }
    },

    /**
     * Updates the user's profile information.
     */
    async updateUserProfile(uid: string, data: { displayName?: string; phoneNumber?: string; address?: string }) {
        if (!uid) throw new Error('User ID required');
        const userRef = doc(db, 'users', uid);
        await updateDoc(userRef, data);
    }
};
