import { db } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { UserDocument } from '@/types/firestore-schema';

export const TrialService = {
    /**
     * Checks if a user's trial has expired and updates their subscription status in Firestore if necessary.
     * Returns true if the user is currently expired (either previously or just now), false otherwise.
     */
    async checkAndProcessExpiration(uid: string, userProfile: UserDocument): Promise<boolean> {
        if (!userProfile?.subscription) return false;

        const { status, trialEndAt } = userProfile.subscription;

        // If already expired or canceled, return true (access denied for standard dashboard)
        if (status === 'expired' || status === 'requires_payment_method' || status === 'canceled') {
            return true;
        }

        // Check if trial has ended
        if (status === 'trial' && Date.now() > trialEndAt) {
            try {
                const userRef = doc(db, 'users', uid);
                await updateDoc(userRef, {
                    'subscription.status': 'expired',
                    'subscription.isActive': false
                });
                return true; // Just expired
            } catch (error) {
                console.error("Error updating trial expiration:", error);
                // Return true anyway to block access since we know it's technically expired
                return true; 
            }
        }

        return false;
    }
};
