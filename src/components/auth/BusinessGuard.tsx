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

    useEffect(() => {
        if (loading) return;

        const currentPathWithQuery = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '');

        // 1. Unauthenticated -> Login
        if (!user) {
            router.replace(`/auth/login?returnTo=${encodeURIComponent(currentPathWithQuery)}`);
            return;
        }

        // 2. User exists but Profile not loaded yet?
        // If userProfile is null but user exists, it might be loading or failed. 
        // AuthContext usually sets loading=false after trying to fetch/create.
        // If it sends null, it means creation failed or logic gap.
        // We will assume if !userProfile here, we redirect to onboarding as fallback or wait.
        if (!userProfile) {
            // Safe fallback
            router.replace(`/onboarding?returnTo=${encodeURIComponent(currentPathWithQuery)}`);
            return;
        }

        // 3. Check Provider Role
        if (!userProfile.roles?.provider) {
            // Not a provider -> Onboarding
            router.replace(`/onboarding?returnTo=${encodeURIComponent(currentPathWithQuery)}`);
            return;
        }

        // 4. Check Business Profile Existence (Wizard Check)
        const hasBusiness = !!userProfile.businessProfileId; // Adjust field name based on schema
        const isSetupPage = pathname.startsWith('/business/setup');

        if (!hasBusiness) {
            // Provider without business -> Force Setup
            if (!isSetupPage) {
                router.replace('/business/setup');
            } else {
                setIsAuthorized(true);
            }
        } else {
            // Provider WITH business
            if (isSetupPage) {
                // Already setup -> Go to Dashboard
                router.replace('/business/dashboard');
            } else {
                setIsAuthorized(true);
            }
        }

    }, [user, userProfile, loading, pathname, searchParams, router]);

    if (loading || !isAuthorized) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-[#0B0F19]">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-cyan-500 border-t-transparent"></div>
            </div>
        );
    }

    return <>{children}</>;
}
