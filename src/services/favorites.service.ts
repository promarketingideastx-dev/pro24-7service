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
    businessId: string;
    userName?: string;
    userEmail?: string;
    savedAt: any;
}

// ─── Service ──────────────────────────────────────────────────────────────────
export const FavoritesService = {

    /**
     * Toggle favorite for a user.
     * Primary write: user's own favorites subcollection (always allowed).
     * Secondary write: top-level 'businessLeads' collection (fail silently if permission denied).
     * Returns true if added, false if removed.
     */
    async toggle(
        userId: string,
        userInfo: { name?: string; email?: string },
        business: { id: string; name: string; category?: string; city?: string; logoUrl?: string }
    ): Promise<boolean> {
        if (!userId || !business?.id) {
            console.error('[FavoritesService.toggle] Missing userId or business.id', { userId, businessId: business?.id });
            throw new Error('Missing userId or business.id');
        }

        const favRef = doc(db, `users/${userId}/favorites/${business.id}`);

        let existing;
        try {
            existing = await getDoc(favRef);
        } catch (err) {
            console.error('[FavoritesService.toggle] getDoc failed:', err);
            throw err;
        }

        if (existing.exists()) {
            // Remove favorite
            try {
                await deleteDoc(favRef);
            } catch (err) {
                console.error('[FavoritesService.toggle] deleteDoc favRef failed:', err);
                throw err;
            }
            // Try to remove lead (fail silently)
            try {
                await deleteDoc(doc(db, `businessLeads/${business.id}_${userId}`));
            } catch { /* non-critical */ }
            return false;
        } else {
            // Add favorite
            const favData: FavoriteRecord = {
                businessId: business.id,
                businessName: business.name,
                businessCategory: business.category,
                businessCity: business.city,
                businessLogoUrl: business.logoUrl,
                savedAt: serverTimestamp(),
            };
            try {
                await setDoc(favRef, favData);
            } catch (err) {
                console.error('[FavoritesService.toggle] setDoc favRef failed:', err);
                throw err;
            }

            // Try to write a lead record (fail silently — non-critical)
            try {
                const leadData: LeadRecord = {
                    userId,
                    businessId: business.id,
                    userName: userInfo.name,
                    userEmail: userInfo.email,
                    savedAt: serverTimestamp(),
                };
                await setDoc(doc(db, `businessLeads/${business.id}_${userId}`), leadData);
            } catch { /* non-critical */ }

            return true;
        }
    },

    /** Check if a user has favorited a business. */
    async isFavorited(userId: string, businessId: string): Promise<boolean> {
        try {
            const ref = doc(db, `users/${userId}/favorites/${businessId}`);
            const snap = await getDoc(ref);
            return snap.exists();
        } catch {
            return false;
        }
    },

    /** Get all favorites for a user. */
    async getFavorites(userId: string): Promise<FavoriteRecord[]> {
        try {
            const ref = collection(db, `users/${userId}/favorites`);
            const snap = await getDocs(ref);
            return snap.docs.map(d => d.data() as FavoriteRecord);
        } catch {
            return [];
        }
    },

    /** Get all leads for a business (for business dashboard). */
    async getLeads(businessId: string): Promise<LeadRecord[]> {
        try {
            const ref = collection(db, 'businessLeads');
            const snap = await getDocs(ref);
            return snap.docs
                .filter(d => d.data().businessId === businessId)
                .map(d => d.data() as LeadRecord);
        } catch {
            return [];
        }
    },
};
