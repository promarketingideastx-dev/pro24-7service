'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

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


        // 3. Check Provider Role (roles.provider, role='provider', or roles.admin/isAdmin all qualify)
        const isAdmin = userProfile.isAdmin === true || userProfile.roles?.admin === true;
        const isProvider = userProfile.roles?.provider || userProfile.role === 'provider' || isAdmin;
        if (!isProvider) {
            // Not a provider -> Onboarding
            console.log('[BusinessGuard] Redirecting to onboarding'); redirect(lp(`/onboarding?returnTo=${encodeURIComponent(currentPathWithQuery)}`));
            return;
        }

        // 4. Admin users always have full access to all business routes
        if (isAdmin) {
            setIsAuthorized(true);
            return;
        }

        // 5. Check Business Profile Existence (for regular providers only)
        const hasBusiness = !!userProfile.businessProfileId;
        const isSetupPage = pathname.includes('/business/setup');
        const isBusinessRoute = pathname.includes('/business');

        if (hasBusiness) {
            // Provider WITH business
            if (isSetupPage) {
                router.replace(lp('/business/dashboard'));
            } else {
                // Allow access
                setIsAuthorized(true);
            }
        } else {
            // Provider WITHOUT business (or partial)
            // If trying to access setup, allow.
            if (isSetupPage) {
                setIsAuthorized(true);
            } else if (isBusinessRoute) {
                // Trying to access dashboard without business -> Setup
                router.replace(lp('/business/setup'));
            } else {
                // Public route -> Allow
                setIsAuthorized(true);
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
