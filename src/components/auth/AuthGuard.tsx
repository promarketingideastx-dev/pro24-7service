'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { UserService } from '@/services/user.service';
import { IdentityService } from '@/services/identity.service';
import { AuthService } from '@/services/auth.service';

const SUPPORTED_LOCALES = ['es', 'pt-BR'];
const PUBLIC_PREFIXES = ["/", "/search", "/negocio", "/auth"];
const AUTH_PREFIXES = ["/auth"];
const ONBOARDING_PREFIXES = ["/onboarding"];
const PROTECTED_PREFIXES = ["/profile", "/citas", "/messages", "/account", "/favoritos", "/solicitudes", "/user"];
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

        const redirect = (path: string) => {
            setTimeout(() => {
                router.replace(path);
            }, 0);
        };

        if (!user) {
            if (startsWithAny(PROTECTED_PREFIXES) || startsWithAny(PROVIDER_ONLY_PREFIXES)) {
                redirect(lp(`/auth/login?returnTo=${encodeURIComponent(currentPathWithQuery)}`));
                return;
            } 
            
            // PORTAL RESTORATION: Only intercept the exact root path '/' for new guests
            if (localelessPath === '/') {
                if (typeof window !== 'undefined' && !sessionStorage.getItem('portal_explored')) {
                    redirect(lp('/onboarding'));
                    return;
                }
            }
            
            setIsAuthorized(true);
            return;
        }

        if (userProfile) {
            // FASE 3: Self-Healing & Strict Status Locks
            if (user.emailVerified && userProfile.accountStatus === 'pending_verification') {
                userProfile.accountStatus = 'active'; // Local mutation for this tick
                UserService.updateUserProfile(user.uid, { accountStatus: 'active', emailVerified: true }).catch(console.error);
                if (user.email) {
                    IdentityService.updateAccountStatus(user.email, 'active').catch(console.error);
                }
            }

            // Exceptions: Admins bypass strict locks to avoid locking out the system owners in edge cases
            const isRootAdmin = userProfile.isAdmin === true || userProfile.roles?.admin === true;

            if (!isRootAdmin) {
                if (userProfile.accountStatus === 'blocked' || userProfile.isBanned) {
                    AuthService.logout().catch(console.error);
                    redirect(lp('/auth/portal?error=blocked'));
                    return;
                }

                if (userProfile.accountStatus === 'canceled' || userProfile.accountStatus === 'archived') {
                    if (localelessPath !== '/auth/reactivate') {
                        redirect(lp('/auth/reactivate'));
                        return;
                    }
                    setIsAuthorized(true);
                    return;
                }

                if (userProfile.accountStatus === 'pending_verification' && !userProfile.legacyTrusted) {
                    if (localelessPath !== '/onboarding/verify-email') {
                        redirect(lp('/onboarding/verify-email'));
                        return;
                    }
                    setIsAuthorized(true);
                    return;
                }
            }

            // 1. EVALUATE CAPABILITIES
            // Support legacy purely-provider strings alongside the new explicit roles object
            const isProvider = userProfile.roles?.provider === true || userProfile.role === 'provider' || userProfile.isProvider === true;
            // Legacy purely provider accounts from bugs might lack client = true, so we assume client capabilities natively unless restricted
            const isClient = userProfile.roles?.client === true || userProfile.role === 'client' || (!isProvider && !isRootAdmin);

            const isOnboardingProvider = !!userProfile.providerOnboardingStatus && userProfile.providerOnboardingStatus !== 'completed';

            const hasRole = isClient || isProvider || isRootAdmin || isOnboardingProvider;

            // Kick out users with utterly malformed/empty schemas
            if (!hasRole) {
                if (startsWithAny(ONBOARDING_PREFIXES) || startsWithAny(PUBLIC_PREFIXES)) {
                    setIsAuthorized(true);
                } else {
                    redirect(lp(`/onboarding?returnTo=${encodeURIComponent(currentPathWithQuery)}`));
                }
                return;
            }

            // 2. STRICT BUSINESS ROUTE PROTECTION
            // If they are trying to reach a /business page, they MUST be a provider, an admin, or onboarding
            const isBusinessSetupRoute = localelessPath === '/business/setup' || localelessPath === '/business/trial-activation';
            if (localelessPath.startsWith('/business') && !isBusinessSetupRoute) {
                if (!isProvider && !isRootAdmin) {
                    if (isOnboardingProvider) {
                        redirect(lp('/business')); // Let BusinessGuard handle them
                    } else {
                        redirect(lp('/pricing')); // Send curious clients to pricing first
                    }
                    return;
                }
            }

            if (startsWithAny(PROVIDER_ONLY_PREFIXES) && !isProvider && !isRootAdmin) {
                 redirect(lp('/'));
                 return;
            }

            // 3. AUTH ROUTE INTERCEPTIONS (Login/Register Forms)
            // Users with profiles shouldn't be visiting login forms. Rout them back to their life.
            if (startsWithAny(AUTH_PREFIXES)) {
                
                // Admins ALWAYS go to the admin dashboard upon logging in, ignoring client/business intents.
                if (isRootAdmin) {
                     redirect(lp('/admin'));
                     return;
                }

                // Respect explicit session returns first (from previous components)
                if (typeof window !== 'undefined') {
                    const stored = sessionStorage.getItem('auth_redirect_to');
                    if (stored) {
                        sessionStorage.removeItem('auth_redirect_to');
                        redirect(stored);
                        return;
                    }
                }
                
                // If they have an explicit intent from the URL they clicked
                const intent = searchParams.get('intent');
                if (intent === 'business') {
                    if (isProvider || isOnboardingProvider) {
                        redirect(lp('/business')); // BusinessGuard will place them
                    } else {
                        redirect(lp('/pricing')); // Non-providers go to pricing
                    }
                    return;
                }
                if (intent === 'client') {
                    redirect(lp('/'));
                    return;
                }

                // If they have a returnTo path
                const returnTo = searchParams.get('returnTo');
                if (returnTo && returnTo !== '/') {
                    const hasLocalePrefix = SUPPORTED_LOCALES.some(p => returnTo?.startsWith('/' + p));
                    redirect(hasLocalePrefix ? returnTo : lp(returnTo));
                    return;
                }
                
                // Fallback: If no intent, figure out default homepage based on highest role
                if (isRootAdmin) {
                    redirect(lp('/admin'));
                } else if (isOnboardingProvider || isProvider) {
                    // Hybrid accounts default routing. AuthGuard sends to root /business. BusinessGuard sorts the rest.
                    redirect(lp('/business'));
                } else {
                    redirect(lp('/'));
                }
                return;
            }

            // PORTAL RESTORATION: Bouncing auth'd users out of the selection screen
            if (startsWithAny(ONBOARDING_PREFIXES)) {
                if (isRootAdmin) {
                    redirect(lp('/admin'));
                } else if (isOnboardingProvider || isProvider) {
                    redirect(lp('/business'));
                } else {
                    redirect(lp('/'));
                }
                return;
            }

            // 4. PUBLIC & PROTECTED ROUTES (Happy Path)
            // If the code reaches here:
            // - The route is NOT /auth
            // - The route is NOT a forbidden /business area
            // - The route is PUBLIC ('/') or a standard PROTECTED client route ('/profile')
            // Hybrid accounts are WELCOME HERE. We do NOT hijack them to Dashboard anymore.
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
