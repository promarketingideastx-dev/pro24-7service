'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

const SUPPORTED_LOCALES = ['es', 'pt-BR'];
const PUBLIC_PREFIXES = ["/", "/search", "/negocio", "/auth"];
const AUTH_PREFIXES = ["/auth"];
const ONBOARDING_PREFIXES = ["/onboarding"];
const PROTECTED_PREFIXES = ["/profile", "/citas", "/messages", "/account", "/favoritos", "/solicitudes"];
const PROVIDER_ONLY_PREFIXES = ["/business/dashboard", "/business/edit"];

export default function AuthGuard({ children }: { children: React.ReactNode }) {
    const { user, userProfile, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isAuthorized, setIsAuthorized] = useState(false);

    useEffect(() => {
        if (loading) return;

        const segments = pathname.split('/').filter(Boolean);
        const locale = SUPPORTED_LOCALES.includes(segments[0]) ? segments[0] : 'es';
        const localelessPath = '/' + (SUPPORTED_LOCALES.includes(segments[0]) ? segments.slice(1).join('/') : segments.join('/'));
        const lp = (path: string) => `/${locale}${path}`;

        const currentPathWithQuery = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '');

        const startsWithAny = (prefixes: string[]) =>
            prefixes.some(p => localelessPath === p || localelessPath.startsWith(p + "/"));

        if (!user) {
            if (startsWithAny(PROTECTED_PREFIXES) || startsWithAny(PROVIDER_ONLY_PREFIXES)) {
                router.replace(lp(`/auth/login?returnTo=${encodeURIComponent(currentPathWithQuery)}`));
            } else {
                setIsAuthorized(true);
            }
            return;
        }

        if (userProfile) {
            const hasRole = userProfile.roles?.client || userProfile.roles?.provider;

            if (!hasRole) {
                if (startsWithAny(ONBOARDING_PREFIXES) || startsWithAny(PUBLIC_PREFIXES)) {
                    setIsAuthorized(true);
                } else {
                    router.replace(lp(`/onboarding?returnTo=${encodeURIComponent(currentPathWithQuery)}`));
                }
                return;
            }

            if (startsWithAny(AUTH_PREFIXES)) {
                router.replace(userProfile.roles.provider ? lp('/business/dashboard') : lp('/'));
                return;
            }

            if (startsWithAny(PROVIDER_ONLY_PREFIXES) && !userProfile.roles.provider) {
                router.replace(lp('/'));
                return;
            }

            setIsAuthorized(true);
        } else {
            if (startsWithAny(ONBOARDING_PREFIXES) || startsWithAny(PUBLIC_PREFIXES)) {
                setIsAuthorized(true);
            } else {
                router.replace(lp(`/onboarding?returnTo=${encodeURIComponent(currentPathWithQuery)}`));
            }
        }

    }, [user, userProfile, loading, pathname, searchParams, router]);

    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-gray-50">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
            </div>
        );
    }

    if (!isAuthorized) return null;

    return <>{children}</>;
}
