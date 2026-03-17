'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { TrialService } from '@/services/trial.service';

export default function BusinessGuard({ children }: { children: React.ReactNode }) {
    const { user, userProfile, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isAuthorized, setIsAuthorized] = useState(false);

    // Extract locale from pathname (e.g. /en/business/dashboard -> 'en')
    const localeMatch = pathname.match(/^\/([a-z]{2}(?:-[A-Z]{2})?)(?:\/|$)/);
    const locale = localeMatch ? localeMatch[1] : 'es';
    // Guard: never double-add locale prefix
    const lp = (path: string) => {
        if (path.startsWith(`/${locale}/`) || path === `/${locale}`) return path;
        return `/${locale}${path}`;
    };

    useEffect(() => {
        if (loading) return;

        const currentPathWithQuery = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '');

        const redirect = (path: string) => {
            setTimeout(() => {
                router.replace(path);
            }, 0);
        };

        // 1. Unauthenticated -> Login
        if (!user) {
            redirect(lp(`/auth/login?returnTo=${encodeURIComponent(currentPathWithQuery)}`));
            return;
        }

        // 2. User exists but profile not yet loaded → just wait (show spinner)
        // Do NOT redirect here — Firestore snapshot may still be in-flight.
        // The effect will re-run once userProfile is set.
        if (!userProfile) {
            return; // Stay on spinner, do not redirect
        }


        // 3. Evaluate Roles and Status
        const isAdmin = userProfile.isAdmin === true || userProfile.roles?.admin === true;
        const isProvider = userProfile.roles?.provider === true || userProfile.role === 'provider';
        const onboardingStatus = userProfile.providerOnboardingStatus;
        const hasBusiness = !!userProfile.businessProfileId || userProfile.isBusinessActive;

        // Determine if user has any business intent or role
        if (!isAdmin && !isProvider && !onboardingStatus && !hasBusiness) {
             console.log('[BusinessGuard] Redirecting non-provider to onboarding');
             redirect(lp(`/onboarding?returnTo=${encodeURIComponent(currentPathWithQuery)}`));
             return;
        }

        // 4. Admin users always have full access to all business routes
        if (isAdmin) {
             setIsAuthorized(true);
             return;
        }

        // 5. Onboarding Step Router
        const isPricingRoute = pathname.includes('/business/pricing');
        const isSetupRoute = pathname.includes('/business/setup');
        const isTrialRoute = pathname.includes('/business/trial-activation');

        // Identify fully operational providers (Completed status, or Legacy ones with businessID but no status)
        const isOperational = onboardingStatus === 'completed' || hasBusiness || (isProvider && !onboardingStatus);

        if (isOperational) {
             // BLOQUE 2D: Enforce Trial Expiration in background 
             if (isProvider && user.uid) {
                 TrialService.checkAndDowngradeTrial(user.uid).catch(() => { });
             }

             // Providers WITH operational business shouldn't hang out in setup unless upgrading/modifying
             if (isSetupRoute || isTrialRoute) { // Pricing could be valid for upgrades, but Setup/Trial are definitely past
                 redirect(lp('/business/dashboard'));
             } else {
                 setIsAuthorized(true);
             }
        } else {
             // Onboarding Provider (Incomplete embudo)
             const currentStatus = onboardingStatus || 'pending_plan';
             
             if (currentStatus === 'pending_plan') {
                 if (!isPricingRoute) redirect(lp('/business/pricing'));
                 else setIsAuthorized(true);
             } else if (currentStatus === 'pending_setup') {
                 if (!isSetupRoute) redirect(lp('/business/setup'));
                 else setIsAuthorized(true);
             } else if (currentStatus === 'pending_trial') {
                 if (!isTrialRoute) redirect(lp('/business/trial-activation'));
                 else setIsAuthorized(true);
             } else {
                 // Fallback safely to plan selection
                 if (!isPricingRoute) redirect(lp('/business/pricing'));
                 else setIsAuthorized(true);
             }
        }

    }, [user, userProfile, loading, pathname, searchParams, router]);

    if (loading || !isAuthorized) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-[#F4F6F8]">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-cyan-500 border-t-transparent"></div>
            </div>
        );
    }

    return <>{children}</>;
}
