import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { UserDocument } from '@/types/firestore-schema';
import { getCountryFromTimezone } from '@/utils/timezone-country';

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
            const defaultUser: Partial<UserDocument> & Record<string, any> = {
                uid,
                email,
                accountStatus: 'pending_verification', // V3 Identity Rules
                onboardingStatus: 'not_started',
                emailVerified: false,
                legacyTrusted: false,
                roles: {
                    client: true, // Everyone is natively a client.
                    provider: false,
                    admin: false
                },
                role: null, // Initialize primary role as null
                createdAt: serverTimestamp() as any,
                lastLogin: serverTimestamp() as any,
                country_code: getCountryFromTimezone(),
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
    async setUserRole(uid: string, role: 'client' | 'provider' | 'provider_intent') {
        if (!uid) throw new Error('User ID required');

        const userRef = doc(db, 'users', uid);

        // We use merge: true to make roles ADDITIVE.
        // Granting provider does not remove client capabilities.
        if (role === 'provider') {
            const userSnap = await getDoc(userRef);
            const userData = userSnap.data() as UserDocument;
            const plan = userData?.selectedPlan || 'premium';
            
            const now = Date.now();
            const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;

            await setDoc(userRef, {
                role: 'provider', // Legacy primary string (kept for backwards compatibility for edge cases)
                roles: { 
                    provider: true,
                    client: true // Ensure legacy accounts migrating to provider get client explicitly enabled
                },
                providerOnboardingStatus: 'completed',
                isBusinessActive: false,
                subscription: {
                    plan: plan,
                    status: 'trial',
                    trialStartAt: now,
                    trialEndAt: now + sevenDaysInMs,
                    isActive: true
                }
            }, { merge: true });
        } else if (role === 'provider_intent') {
            // A user attempting to become a provider hasn't finished onboarding.
            // Do NOT grant operational roles. Only grant intent flags.
            await setDoc(userRef, {
                roles: { 
                    provider: false, // Explicitly false until they complete setup
                    client: true 
                },
                providerOnboardingStatus: 'pending_plan'
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
    async updateUserProfile(uid: string, data: Record<string, any>) {
        if (!uid) throw new Error('User ID required');
        const userRef = doc(db, 'users', uid);
        await updateDoc(userRef, data as any);
    },

    /**
     * Sets the selected plan and advances the provider onboarding status.
     * This satisfies the Pricing -> Setup transition.
     */
    async setPlanAndAdvanceToSetup(uid: string, planId: 'premium' | 'plus_team') {
        if (!uid) throw new Error('User ID required');
        const userRef = doc(db, 'users', uid);
        await setDoc(userRef, {
            selectedPlan: planId,
            providerOnboardingStatus: 'pending_setup'
        }, { merge: true });
    }
};
