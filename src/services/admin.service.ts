import { db } from '@/lib/firebase';
import {
    collection, getDocs, query, orderBy, updateDoc, doc,
    Timestamp, where, limit, startAfter, DocumentSnapshot
} from 'firebase/firestore';
import { BusinessPlan } from '@/types/firestore-schema';

export interface AdminBusinessRecord {
    id: string;
    businessName: string;
    ownerEmail?: string;
    countryCode?: string;
    phone?: string;
    logoUrl?: string;
    coverUrl?: string;
    category?: string;
    createdAt?: any;
    planData?: {
        plan: BusinessPlan;
        planStatus?: string;
        planSource?: string;
        planExpiresAt?: any;
        overriddenByCRM?: boolean;
    };
    active?: boolean;
    location?: { city?: string; countryCode?: string };
}

export const AdminService = {
    // ── Businesses ──

    async getBusinesses(countryFilter?: string, lastDoc?: DocumentSnapshot): Promise<AdminBusinessRecord[]> {
        let q = query(
            collection(db, 'businesses'),
            orderBy('createdAt', 'desc'),
            limit(50)
        );
        if (countryFilter && countryFilter !== 'ALL') {
            q = query(
                collection(db, 'businesses'),
                where('countryCode', '==', countryFilter),
                orderBy('createdAt', 'desc'),
                limit(50)
            );
        }
        if (lastDoc) q = query(q, startAfter(lastDoc));
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as AdminBusinessRecord));
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
        await updateDoc(doc(db, 'businesses', businessId), { planData });
    },

    async suspendBusiness(businessId: string, suspended: boolean): Promise<void> {
        await updateDoc(doc(db, 'businesses', businessId), {
            suspended,
            'planData.planStatus': suspended ? 'suspended' : 'active'
        });
    },

    // ── Users ──

    async getUsers(countryFilter?: string): Promise<any[]> {
        let q = query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(100));
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    },
};
