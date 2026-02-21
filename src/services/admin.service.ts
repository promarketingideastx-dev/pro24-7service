import { db } from '@/lib/firebase';
import {
    collection, getDocs, query, updateDoc, doc,
    Timestamp, limit, getDoc
} from 'firebase/firestore';
import { BusinessPlan } from '@/types/firestore-schema';

export interface AdminBusinessRecord {
    id: string;
    // businesses_public fields
    name?: string;          // The actual business name (field 'name' in Firestore)
    businessName?: string;  // alias for compatibility
    country?: string;       // 'HN', 'US', 'MX', etc.
    city?: string;
    department?: string;
    category?: string;
    phone?: string;
    website?: string;
    status?: string;
    rating?: number;
    coverImage?: string;
    createdAt?: any;
    updatedAt?: any;
    modality?: string;
    // businesses_private fields (joined)
    email?: string;
    address?: string;
    // planData (from businesses_public or separate doc)
    planData?: {
        plan: BusinessPlan;
        planStatus?: string;
        planSource?: string;
        planExpiresAt?: any;
        overriddenByCRM?: boolean;
    };
    suspended?: boolean;
}

export const AdminService = {
    // ── Businesses ──

    async getBusinesses(countryFilter?: string): Promise<AdminBusinessRecord[]> {
        // Data is in businesses_public collection
        const q = query(
            collection(db, 'businesses_public'),
            limit(200)
        );
        const snap = await getDocs(q);
        let results = snap.docs.map(d => {
            const data = d.data();
            return {
                id: d.id,
                ...data,
                businessName: data.name, // alias
            } as AdminBusinessRecord;
        });

        // Filter by country client-side
        if (countryFilter && countryFilter !== 'ALL') {
            results = results.filter(b => b.country === countryFilter);
        }

        // Sort by createdAt descending
        results.sort((a, b) => {
            const aTime = a.createdAt?.toMillis?.() ?? (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0);
            const bTime = b.createdAt?.toMillis?.() ?? (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0);
            return bTime - aTime;
        });

        // Enrich with plan data from businesses_public (planData sub-field)
        // Already included from spread above

        return results;
    },

    async setPlan(businessId: string, plan: BusinessPlan, adminEmail: string): Promise<void> {
        const planData = {
            plan,
            planStatus: 'active',
            planSource: 'crm_override',
            overriddenByCRM: true,
            updatedAt: Timestamp.now(),
            updatedBy: adminEmail,
        };
        // Write to businesses_public (where the plan data lives)
        await updateDoc(doc(db, 'businesses_public', businessId), { planData });
    },

    async suspendBusiness(businessId: string, suspended: boolean): Promise<void> {
        await updateDoc(doc(db, 'businesses_public', businessId), {
            suspended,
            status: suspended ? 'suspended' : 'active',
        });
    },

    // ── Users ──

    async getUsers(): Promise<any[]> {
        const q = query(collection(db, 'users'), limit(100));
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    },
};
