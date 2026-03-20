import { db } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { UserDocument } from '@/types/firestore-schema';

export interface TrialStatus {
    isInTrial: boolean;
    isExpired: boolean;
    daysLeft: number;
    showReminderBanner: boolean;
    showUrgentBanner: boolean;
    overriddenByCRM: boolean;
}

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
    },

    getTrialStatus(business: any): TrialStatus {
        if (!business?.planData || business.planData.planSource === 'collaborator_beta') {
            return {
                isInTrial: false, isExpired: false, daysLeft: 0,
                showReminderBanner: false, showUrgentBanner: false, overriddenByCRM: true
            };
        }
        
        const trialEndAt = business.planData?.trialEndAt || 0;
        const now = Date.now();
        const daysLeft = Math.max(0, Math.ceil((trialEndAt - now) / (1000 * 60 * 60 * 24)));
        const isExpired = business.planData?.status === 'expired' || (business.planData?.status === 'trial' && now > trialEndAt);
        const isInTrial = business.planData?.status === 'trial' && !isExpired;

        return {
            isInTrial,
            isExpired,
            daysLeft,
            showReminderBanner: isInTrial && daysLeft <= 3,
            showUrgentBanner: isInTrial && daysLeft <= 1,
            overriddenByCRM: false
        };
    }
};
