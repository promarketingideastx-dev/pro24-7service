/**
 * PlanService — helper to check feature availability based on business plan.
 * All unlocked features during beta since every business defaults to 'premium'.
 */

import { db } from '@/lib/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import type { BusinessPlan, BusinessPlanData, BusinessPlanSource } from '@/types/firestore-schema';

// ── Plan hierarchy ─────────────────────────────────────────────────────────
const PLAN_RANK: Record<BusinessPlan, number> = {
    free: 0,
    premium: 1,
    plus_team: 2,
    vip: 3,
};

export const PlanService = {
    /** Team member hard limits per plan */
    TEAM_LIMITS: {
        free: 0,
        premium: 1,
        plus_team: 5,
        vip: 999,        // Effectively unlimited; CRM admin manages individually
    } as Record<BusinessPlan, number>,

    /** Service hard limits per plan */
    SERVICE_LIMITS: {
        free: 5,
        premium: 999,
        plus_team: 999,
        vip: 999,
    } as Record<BusinessPlan, number>,

    /** Plan display labels */
    PLAN_LABELS: {
        free: 'Gratis',
        premium: 'Premium',
        plus_team: 'Plus Equipo',
        vip: 'Pro24/7YA Colaboradores',
    } as Record<BusinessPlan, string>,

    /** Plan prices (web/PWA) */
    PLAN_PRICES: {
        free: 0,
        premium: 9.99,
        plus_team: 14.99,
        vip: 0,
    } as Record<BusinessPlan, number>,

    // ── Feature gates ────────────────────────────────────────────────────

    /** Can this plan create a business profile at all? */
    canCreateBusiness(plan: BusinessPlan): boolean {
        return PLAN_RANK[plan] >= PLAN_RANK['premium'];
    },

    /** Can this plan manage a team? */
    canUseTeam(plan: BusinessPlan): boolean {
        return PLAN_RANK[plan] >= PLAN_RANK['plus_team'];
    },

    /** How many team members are allowed? */
    getTeamLimit(plan: BusinessPlan): number {
        return PlanService.TEAM_LIMITS[plan] ?? 0;
    },

    /** How many services are allowed? */
    getServiceLimit(plan: BusinessPlan): number {
        return PlanService.SERVICE_LIMITS[plan] ?? 5;
    },

    /** Is the plan at least Premium? */
    isPremium(plan: BusinessPlan): boolean {
        return PLAN_RANK[plan] >= PLAN_RANK['premium'];
    },

    /** Is the plan at least Plus Equipo? */
    isPlusTeam(plan: BusinessPlan): boolean {
        return PLAN_RANK[plan] >= PLAN_RANK['plus_team'];
    },

    /** Is the plan VIP? */
    isVip(plan: BusinessPlan): boolean {
        return plan === 'vip';
    },

    // ── Default plan data (beta: everyone gets premium) ──────────────────

    getDefaultPlanData(): BusinessPlanData {
        return {
            plan: 'premium',
            planStatus: 'active',
            planSource: 'crm_override',
            teamMemberLimit: 0,
            overriddenByCRM: true,  // beta override
        };
    },

    // ── Firestore writes ─────────────────────────────────────────────────

    /**
     * Update a business's plan.
     * Used by CRM admin to manually set or override any plan.
     */
    async setPlan(
        businessId: string,
        plan: BusinessPlan,
        source: BusinessPlanSource = 'crm_override',
        overrides: Partial<BusinessPlanData> = {}
    ): Promise<void> {
        const planData: BusinessPlanData = {
            plan,
            planStatus: 'active',
            planSource: source,
            teamMemberLimit: PlanService.TEAM_LIMITS[plan],
            overriddenByCRM: source === 'crm_override',
            ...overrides,
        };

        await updateDoc(doc(db, 'businesses', businessId), {
            planData,
            updatedAt: serverTimestamp(),
        });
    },

    /**
     * Get the effective plan from a business object.
     * Falls back to 'premium' if planData is missing (beta grace).
     */
    getEffectivePlan(business: { planData?: BusinessPlanData }): BusinessPlan {
        return business?.planData?.plan ?? 'premium';  // beta default
    },

    /** Returns true if the plan is expired or inactive or the trial ended */
    isPlanExpired(planData?: any): boolean {
        if (!planData) return false; // Default to active if missing
        if (planData.planStatus === 'expired' || planData.planStatus === 'inactive' || planData.planStatus === 'cancelled') return true;
        if ((planData.planStatus === 'trial' || planData.planStatus === 'trialing') && planData.trialEndDate) {
            return new Date(planData.trialEndDate) < new Date();
        }
        return false;
    },

    /** Returns badge color class for a plan */
    getPlanBadgeClass(plan: BusinessPlan): string {
        const map: Record<BusinessPlan, string> = {
            free: 'bg-slate-500/20 text-slate-400',
            premium: 'bg-blue-500/20 text-blue-400',
            plus_team: 'bg-brand-neon-cyan/20 text-brand-neon-cyan',
            vip: 'bg-amber-500/20 text-amber-400',
        };
        return map[plan] ?? map.free;
    },
};

export type { BusinessPlan, BusinessPlanData, BusinessPlanSource };
