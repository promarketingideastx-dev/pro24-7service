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
import { doc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import type { BusinessPlan } from '@/types/firestore-schema';

export const TRIAL_DAYS = 7;

export interface TrialStatus {
    isInTrial: boolean;
    isExpired: boolean;
    daysLeft: number;
    daysUsed: number;
    trialEndDate: Date | null;
    showReminderBanner: boolean; // true when 1 day left
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
            showReminderBanner: daysLeft === 1,
            showUrgentBanner: daysLeft === 0 && !isExpired,
            overriddenByCRM: false,
        };
    },

    /**
     * Returns the default plan data for a NEW business (starts 7-day trial).
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
     * Formats trial status for display.
     */
    formatDaysLeft(daysLeft: number): string {
        if (daysLeft === 0) return 'Hoy es el último día';
        if (daysLeft === 1) return '1 día restante';
        return `${daysLeft} días restantes`;
    },
};
