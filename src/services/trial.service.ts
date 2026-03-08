/**
 * TrialService — Manages the 7-day free trial logic for business accounts.
 * 
 * - Trials start when a business profile is created.
 * - No credit card required during trial.
 * - Day 6: reminder banner shown.
 * - Day 7+: account redirected to /pricing.
 * - CRM betaOverride bypasses trial checks entirely.
 */

import { db } from '@/lib/firebase';
import { doc, updateDoc, getDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import type { BusinessPlan } from '@/types/firestore-schema';
import { PlanService } from './plan.service';
import { EmployeeService } from './employee.service';

export const TRIAL_DAYS = 14;

export interface TrialStatus {
    isInTrial: boolean;
    isExpired: boolean;
    daysLeft: number;
    daysUsed: number;
    trialEndDate: Date | null;
    showReminderBanner: boolean; // true when <= 5 days left
    showUrgentBanner: boolean;   // true when 0 days left (last day)
    overriddenByCRM: boolean;    // beta override — trial checks skipped
}

export const TrialService = {

    /**
     * Calculate trial status from a business document.
     * Safe to call even if trialStartDate doesn't exist (legacy businesses).
     */
    getTrialStatus(business: {
        planData?: {
            plan?: BusinessPlan;
            planStatus?: string;
            overriddenByCRM?: boolean;
            trialStartDate?: Timestamp | Date | string | null;
            trialEndDate?: Timestamp | Date | string | null;
        };
    }): TrialStatus {
        const planData = business?.planData;

        // CRM beta override — bypass all trial logic
        if (planData?.overriddenByCRM) {
            return {
                isInTrial: false,
                isExpired: false,
                daysLeft: TRIAL_DAYS,
                daysUsed: 0,
                trialEndDate: null,
                showReminderBanner: false,
                showUrgentBanner: false,
                overriddenByCRM: true,
            };
        }

        // If no trial data → treat as expired (forces pricing page)
        const rawStart = planData?.trialStartDate;
        if (!rawStart) {
            return {
                isInTrial: false,
                isExpired: true,
                daysLeft: 0,
                daysUsed: TRIAL_DAYS,
                trialEndDate: null,
                showReminderBanner: false,
                showUrgentBanner: false,
                overriddenByCRM: false,
            };
        }

        // Normalize to Date
        let startDate: Date;
        if (rawStart instanceof Timestamp) {
            startDate = rawStart.toDate();
        } else if (rawStart instanceof Date) {
            startDate = rawStart;
        } else {
            startDate = new Date(rawStart);
        }

        const now = new Date();
        const trialEndDate = new Date(startDate.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
        const msLeft = trialEndDate.getTime() - now.getTime();
        const daysLeft = Math.max(0, Math.ceil(msLeft / (24 * 60 * 60 * 1000)));
        const daysUsed = TRIAL_DAYS - daysLeft;
        const isExpired = msLeft <= 0;
        const isInTrial = !isExpired;

        return {
            isInTrial,
            isExpired,
            daysLeft,
            daysUsed,
            trialEndDate,
            showReminderBanner: daysLeft <= 5 && !isExpired,
            showUrgentBanner: daysLeft === 0 && !isExpired,
            overriddenByCRM: false,
        };
    },

    /**
     * Returns the default plan data for a NEW business (starts 14-day trial).
     * Called by BusinessProfileService.createProfile().
     */
    getNewBusinessPlanData() {
        const now = new Date();
        const trialEndDate = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);

        return {
            plan: 'premium' as BusinessPlan,
            planStatus: 'trial' as const,
            planSource: 'trial' as const,
            teamMemberLimit: 5, // Full access during trial
            overriddenByCRM: false,
            trialStartDate: now.toISOString(),
            trialEndDate: trialEndDate.toISOString(),
        };
    },

    /**
     * Activates a paid plan after trial ends.
     * Used when user selects a plan from /pricing.
     */
    async activatePlan(
        businessId: string,
        plan: BusinessPlan,
        teamMemberLimit: number
    ): Promise<void> {
        await updateDoc(doc(db, 'businesses', businessId), {
            'planData.plan': plan,
            'planData.planStatus': 'active',
            'planData.planSource': 'self_serve',
            'planData.teamMemberLimit': teamMemberLimit,
            'planData.activatedAt': serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
    },

    /**
     * Modificador en segundo plano que detecta trial expirado y fuerza el Plan FREE,
     * suspendiendo también a los empleados activos sobrantes.
     */
    async checkAndDowngradeTrial(businessId: string): Promise<boolean> {
        try {
            const bizRef = doc(db, 'businesses', businessId);
            const snap = await getDoc(bizRef);
            if (!snap.exists()) return false;

            const bizData = snap.data();
            const status = TrialService.getTrialStatus(bizData);

            if (status.isExpired && bizData?.planData?.planStatus === 'trial') {
                const limit = PlanService.TEAM_LIMITS['free'] || 0;

                // 1. Downgrade a Free
                await updateDoc(bizRef, {
                    'planData.plan': 'free',
                    'planData.planStatus': 'expired',
                    'planData.teamMemberLimit': limit,
                    updatedAt: serverTimestamp(),
                });

                // 2. Suspender empleados sobrantes basándose en el límite FREE (0)
                await EmployeeService.suspendOverLimitEmployees(businessId, limit);

                return true;
            }
            return false;
        } catch (error) {
            console.error("Error checking trial expiration:", error);
            return false;
        }
    },

    /**
     * Formats trial status for display.
     */
    formatDaysLeft(daysLeft: number): string {
        if (daysLeft === 0) return 'Hoy es el último día';
        if (daysLeft === 1) return '1 día restante';
        return `${daysLeft} días restantes`;
    },
};
