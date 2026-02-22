import { db } from '@/lib/firebase';
import {
    collection, getDocs, query, updateDoc, doc,
    Timestamp, limit, getDoc
} from 'firebase/firestore';
import { BusinessPlan } from '@/types/firestore-schema';
import { AdminNotificationService } from '@/services/adminNotification.service';

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
    logoUrl?: string;    // Business logo / avatar uploaded during registration
    createdAt?: any;
    updatedAt?: any;
    modality?: string;
    // businesses_private fields (joined)
    email?: string;
    address?: string;
    socialMedia?: { instagram?: string; facebook?: string; tiktok?: string };
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
        // Read current plan before overwriting (for email diff)
        let oldPlan: string | undefined;
        try {
            const snap = await getDoc(doc(db, 'businesses_public', businessId));
            oldPlan = (snap.data()?.planData?.plan as string | undefined);
        } catch { /* best effort */ }

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

        // Fire-and-forget: notify admin of plan change
        const bizSnap = await getDoc(doc(db, 'businesses_public', businessId)).catch(() => null);
        const bizName: string = (bizSnap?.data()?.name as string | undefined) ?? businessId;
        const bizCountry: string = (bizSnap?.data()?.country as string | undefined) ?? '';
        fetch('/api/notify-admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'plan_upgrade',
                data: { businessName: bizName, newPlan: plan, oldPlan, adminEmail },
            }),
        }).catch(() => { /* silent */ });

        // In-app notification
        AdminNotificationService.create({
            type: 'plan_upgrade',
            title: `⭐ Plan ${plan.toUpperCase()} asignado a ${bizName}`,
            body: `Plan anterior: ${oldPlan ?? 'free'} → ${plan} · Por: ${adminEmail}`,
            country: bizCountry,
            relatedId: businessId,
            relatedName: bizName,
        }).catch(() => { /* silent */ });
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

    // ── Dashboard Stats ──

    async getDashboardStats(countryFilter?: string) {
        const [bizSnap, usersSnap] = await Promise.all([
            getDocs(query(collection(db, 'businesses_public'), limit(500))),
            getDocs(query(collection(db, 'users'), limit(500))),
        ]);

        let businesses = bizSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
        if (countryFilter && countryFilter !== 'ALL') {
            businesses = businesses.filter((b: any) => b.country === countryFilter);
        }

        const now = Date.now();
        const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
        const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

        const toMs = (ts: any) => ts?.toMillis?.() ?? (ts?.seconds ? ts.seconds * 1000 : 0);

        // Business counts
        const totalBusinesses = businesses.length;
        const activeBusinesses = businesses.filter((b: any) => b.status !== 'suspended').length;
        const newLast30d = businesses.filter((b: any) => toMs(b.createdAt) > thirtyDaysAgo).length;
        const newLast7d = businesses.filter((b: any) => toMs(b.createdAt) > sevenDaysAgo).length;
        const suspended = businesses.filter((b: any) => b.suspended === true).length;

        // Plan distribution
        const planCounts: Record<string, number> = { free: 0, premium: 0, plus_team: 0, vip: 0 };
        businesses.forEach((b: any) => {
            const plan = b.planData?.plan ?? 'free';
            planCounts[plan] = (planCounts[plan] ?? 0) + 1;
        });

        // Estimated MRR (USD)
        const PLAN_PRICE: Record<string, number> = { free: 0, premium: 29, plus_team: 79, vip: 199 };
        const mrr = Object.entries(planCounts).reduce((sum, [plan, count]) => sum + (PLAN_PRICE[plan] ?? 0) * count, 0);

        // Users
        let users = usersSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
        if (countryFilter && countryFilter !== 'ALL') {
            users = users.filter((u: any) => u.country_code === countryFilter || u.countryCode === countryFilter);
        }
        const totalUsers = users.length;
        const newUsers30d = users.filter((u: any) => toMs(u.createdAt) > thirtyDaysAgo).length;
        const providers = users.filter((u: any) => u.isProvider === true).length;

        // Country distribution
        const countryMap: Record<string, number> = {};
        businesses.forEach((b: any) => {
            const c = b.country ?? 'N/A';
            countryMap[c] = (countryMap[c] ?? 0) + 1;
        });
        const topCountries = Object.entries(countryMap)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 6)
            .map(([code, count]) => ({ code, count }));

        // Recent businesses (last 5)
        const recent = [...businesses]
            .sort((a: any, b: any) => toMs(b.createdAt) - toMs(a.createdAt))
            .slice(0, 5);

        return {
            totalBusinesses, activeBusinesses, newLast30d, newLast7d, suspended,
            planCounts, mrr,
            totalUsers, newUsers30d, providers,
            topCountries, recent,
        };
    },
};
