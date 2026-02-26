import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import type { BusinessPlan } from '@/types/firestore-schema';

export const StripeService = {

    /**
     * Get the Stripe customer ID stored in Firestore for a business.
     * Returns null if not yet a Stripe customer.
     */
    async getStripeCustomerId(businessId: string): Promise<string | null> {
        try {
            const snap = await getDoc(doc(db, 'businesses_public', businessId));
            return snap.data()?.stripeCustomerId ?? null;
        } catch {
            return null;
        }
    },

    /**
     * Save the Stripe customer ID to Firestore after first checkout.
     */
    async saveStripeCustomerId(businessId: string, customerId: string): Promise<void> {
        await updateDoc(doc(db, 'businesses_public', businessId), {
            stripeCustomerId: customerId,
            updatedAt: serverTimestamp(),
        });
    },

    /**
     * Update the plan in Firestore after a successful Stripe payment.
     * Called from the webhook handler.
     */
    async activatePlan(
        businessId: string,
        plan: BusinessPlan,
        stripeSubscriptionId: string
    ): Promise<void> {
        await updateDoc(doc(db, 'businesses_public', businessId), {
            'planData.plan': plan,
            'planData.planStatus': 'active',
            'planData.planSource': 'stripe',
            'planData.stripeSubscriptionId': stripeSubscriptionId,
            'planData.overriddenByCRM': false,
            updatedAt: serverTimestamp(),
        });
    },

    /**
     * Downgrade to free plan when subscription is cancelled/expired.
     * Called from the webhook handler on subscription deletion.
     */
    async deactivatePlan(businessId: string): Promise<void> {
        await updateDoc(doc(db, 'businesses_public', businessId), {
            'planData.plan': 'free',
            'planData.planStatus': 'cancelled',
            'planData.planSource': 'stripe',
            'planData.stripeSubscriptionId': null,
            'planData.overriddenByCRM': false,
            updatedAt: serverTimestamp(),
        });
    },

    /**
     * Get a business's subscription status from Firestore.
     */
    async getSubscriptionStatus(businessId: string): Promise<{
        plan: BusinessPlan;
        status: string;
        source: string;
        stripeCustomerId: string | null;
    }> {
        const snap = await getDoc(doc(db, 'businesses_public', businessId));
        const data = snap.data();
        return {
            plan: data?.planData?.plan ?? 'free',
            status: data?.planData?.planStatus ?? 'inactive',
            source: data?.planData?.planSource ?? 'none',
            stripeCustomerId: data?.stripeCustomerId ?? null,
        };
    },

    /**
     * Find businessId from Stripe customer ID.
     * Used in webhook handler to identify which business to update.
     */
    async findBusinessByCustomerId(customerId: string): Promise<string | null> {
        // We store stripeCustomerId in businesses_public
        // For webhook lookup, we use the client_reference_id set during checkout
        // This is a fallback if reference_id is not available
        const { collection, query, where, getDocs } = await import('firebase/firestore');
        const q = query(
            collection(db, 'businesses_public'),
            where('stripeCustomerId', '==', customerId)
        );
        const snap = await getDocs(q);
        if (snap.empty) return null;
        return snap.docs[0].id;
    },
};
