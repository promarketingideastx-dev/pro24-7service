import { db } from '@/lib/firebase';
import {
    doc, setDoc, deleteDoc, collection,
    getDocs, serverTimestamp, getDoc
} from 'firebase/firestore';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface FavoriteRecord {
    businessId: string;
    businessName: string;
    businessCategory?: string;
    businessCity?: string;
    businessLogoUrl?: string;
    savedAt: any;
}

export interface LeadRecord {
    userId: string;
    userName?: string;
    userEmail?: string;
    userPhone?: string;
    savedAt: any;
}

// ─── Service ──────────────────────────────────────────────────────────────────
export const FavoritesService = {

    /**
     * Toggle favorite for a user.
     * Also writes/removes a lead record on the business side.
     * Returns true if added, false if removed.
     */
    async toggle(
        userId: string,
        userInfo: { name?: string; email?: string; phone?: string },
        business: { id: string; name: string; category?: string; city?: string; logoUrl?: string }
    ): Promise<boolean> {
        const favRef = doc(db, `users/${userId}/favorites/${business.id}`);
        const leadRef = doc(db, `businesses/${business.id}/leads/${userId}`);

        const existing = await getDoc(favRef);

        if (existing.exists()) {
            // Remove favorite + lead
            await Promise.all([
                deleteDoc(favRef),
                deleteDoc(leadRef),
            ]);
            return false;
        } else {
            // Add favorite on user side
            const favData: FavoriteRecord = {
                businessId: business.id,
                businessName: business.name,
                businessCategory: business.category,
                businessCity: business.city,
                businessLogoUrl: business.logoUrl,
                savedAt: serverTimestamp(),
            };
            // Add lead on business side
            const leadData: LeadRecord = {
                userId,
                userName: userInfo.name,
                userEmail: userInfo.email,
                userPhone: userInfo.phone,
                savedAt: serverTimestamp(),
            };
            await Promise.all([
                setDoc(favRef, favData),
                setDoc(leadRef, leadData),
            ]);
            return true;
        }
    },

    /**
     * Check if a user has favorited a business.
     */
    async isFavorited(userId: string, businessId: string): Promise<boolean> {
        const ref = doc(db, `users/${userId}/favorites/${businessId}`);
        const snap = await getDoc(ref);
        return snap.exists();
    },

    /**
     * Get all favorites for a user.
     */
    async getFavorites(userId: string): Promise<FavoriteRecord[]> {
        const ref = collection(db, `users/${userId}/favorites`);
        const snap = await getDocs(ref);
        return snap.docs.map(d => d.data() as FavoriteRecord);
    },

    /**
     * Get all leads (users who favorited) for a business.
     */
    async getLeads(businessId: string): Promise<LeadRecord[]> {
        const ref = collection(db, `businesses/${businessId}/leads`);
        const snap = await getDocs(ref);
        return snap.docs.map(d => d.data() as LeadRecord);
    },
};
