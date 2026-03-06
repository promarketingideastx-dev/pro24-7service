'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useAuth } from '@/context/AuthContext';
import { UserService } from '@/services/user.service';
import { db } from '@/lib/firebase';
import { enableNetwork } from 'firebase/firestore';
import { toast } from 'sonner';
import { Search, Briefcase, MapPin } from 'lucide-react';
import { useCountry } from '@/context/CountryContext';
import CountrySelector from '@/components/ui/CountrySelector';
import Logo from '@/components/ui/Logo';

function OnboardingContent() {
    const { user } = useAuth();
    const router = useRouter();
    const locale = useLocale();
    const t = useTranslations('onboarding');
    const LOCALES = ['es', 'en', 'pt-BR'];
    const lp = (path: string) => {
        // Avoid double-prefixing when path already starts with a locale
        const alreadyPrefixed = LOCALES.some(l => path.startsWith(`/${l}/`) || path === `/${l}`);
        return alreadyPrefixed ? path : `/${locale}${path}`;
    };
    const searchParams = useSearchParams();
    const [loading, setLoading] = useState(false);
    const { selectedCountry, clearCountry } = useCountry();

    // mode=login → user is logging in (not registering)
    const isLoginMode = searchParams.get('mode') === 'login';
    const returnTo = searchParams.get('returnTo') || '';

    const handleRoleSelection = async (role: 'client' | 'provider') => {
        const intent = role === 'provider' ? 'business' : 'client';
        const returnParam = returnTo ? `&returnTo=${encodeURIComponent(returnTo)}` : '';

        // 1. Not logged in → send to login or register based on mode
        if (!user) {
            if (isLoginMode) {
                router.push(lp(`/auth/login?intent=${intent}${returnParam}`));
            } else {
                router.push(lp(`/auth/register?intent=${intent}${returnParam}`));
            }
            return;
        }

        // 2. Already logged in → set role and redirect
        setLoading(true);
        try {
            try { await enableNetwork(db); } catch { /* ignore */ }

            const userProfile = await UserService.createUserProfile(user.uid, user.email || '');

            if (typeof window !== 'undefined') {
                localStorage.setItem('pro247_user_mode', role === 'provider' ? 'business' : 'client');
            }

            await UserService.setUserRole(user.uid, role);

            const redirect = (path: string) => {
                setTimeout(() => {
                    router.replace(path);
                }, 0);
            };

            if (userProfile?.isAdmin) {
                redirect(lp('/admin/dashboard'));
                return;
            }

            if (userProfile?.role === 'provider' || userProfile?.roles?.provider || userProfile?.isProvider) {
                if (userProfile?.businessProfileId) {
                    redirect(lp('/business/dashboard'));
                } else {
                    redirect(lp('/business/setup'));
                }
            } else {
                redirect(lp('/'));
            }
        } catch (error: any) {
            console.error('Error saving role:', error);
            if (error.message?.includes('offline')) {
                toast.error(t('errorOffline'));
            } else {
                toast.error(t('errorSaving'));
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#F4F6F8] p-6 relative overflow-hidden">
            {!selectedCountry && <CountrySelector />}

            {/* Background Effects */}
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-500/10 rounded-full blur-[100px] pointer-events-none"></div>

            <div className="relative z-10 w-full max-w-2xl flex flex-col items-center">
                {selectedCountry && (
                    <button
                        onClick={clearCountry}
                        className="mb-6 flex items-center gap-2 bg-white border border-slate-200 px-3 py-1.5 rounded-full text-xs font-bold text-slate-600 shadow-sm hover:shadow-md hover:border-[#14B8A6]/50 transition-all group"
                    >
                        <span className="text-base leading-none">{selectedCountry.flag}</span>
                        <span>{selectedCountry.name}</span>
                        <MapPin className="w-3 h-3 text-slate-400 group-hover:text-[#14B8A6]" />
                    </button>
                )}

                <div className="mb-2 flex flex-col items-center gap-3">
                    <Logo size="lg" />
                    <h1
                        className="text-3xl md:text-4xl font-semibold text-slate-800 tracking-tight leading-tight text-center"
                        style={{ fontFamily: 'var(--font-outfit), sans-serif' }}
                    >
                        {t('title')}
                    </h1>
                </div>
                <p className="text-slate-500 mb-6 text-center text-sm md:text-base font-medium max-w-sm">
                    {isLoginMode ? t('subtitleLogin') : t('subtitle')}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full px-2">
                    {/* Client Option */}
                    <button
                        onClick={() => handleRoleSelection('client')}
                        disabled={loading}
                        className="flex flex-col items-center p-6 bg-blue-500/10 backdrop-blur-md border-[2px] border-blue-500/30 rounded-3xl hover:bg-blue-500/20 hover:border-blue-400 hover:shadow-[0_4px_20px_rgba(59,130,246,0.15)] transition-all group active:scale-95 text-left relative overflow-hidden"
                    >
                        <div className="w-14 h-14 rounded-full bg-blue-500/20 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                            <Search className="w-7 h-7 text-blue-600" />
                        </div>
                        <h2 className="text-lg font-bold mb-1 text-slate-800">{t('clientTitle')}</h2>
                        <p className="text-slate-500 text-center text-xs leading-relaxed max-w-[220px]">
                            {t('clientDesc')}
                        </p>
                        <div className="mt-5 px-6 py-2.5 text-center rounded-xl bg-white text-[#0F766E] text-sm font-bold shadow-[0_4px_14px_rgba(0,0,0,0.1)] group-hover:shadow-[0_6px_20px_rgba(0,0,0,0.15)] transition-all w-[90%] flex items-center justify-center min-h-[44px]">
                            {isLoginMode ? t('loginAsClient') : t('registerFree')}
                        </div>
                    </button>

                    {/* Provider Option */}
                    <button
                        onClick={() => handleRoleSelection('provider')}
                        disabled={loading}
                        className="flex flex-col items-center p-6 bg-pink-500/10 backdrop-blur-md border-[2px] border-pink-500/30 rounded-3xl hover:bg-pink-500/20 hover:border-pink-400 hover:shadow-[0_4px_20px_rgba(236,72,153,0.15)] transition-all group active:scale-95 text-left relative overflow-hidden"
                    >
                        <div className="w-14 h-14 rounded-full bg-pink-500/20 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                            <Briefcase className="w-7 h-7 text-pink-600" />
                        </div>
                        <h2 className="text-lg font-bold mb-1 text-slate-800">{t('providerTitle')}</h2>
                        <p className="text-slate-500 text-center text-xs leading-relaxed max-w-[220px]">
                            {t('providerDesc')}
                        </p>
                        <div className="mt-5 px-6 py-2.5 text-center rounded-xl bg-white text-[#0F766E] text-sm font-bold shadow-[0_4px_14px_rgba(0,0,0,0.1)] group-hover:shadow-[0_6px_20px_rgba(0,0,0,0.15)] transition-all w-[90%] flex items-center justify-center min-h-[44px]">
                            {isLoginMode ? t('loginAsBusiness') : t('registerBusiness')}
                        </div>
                    </button>
                </div>

                <div className="mt-12">
                    <button
                        onClick={() => router.push(lp('/'))}
                        className="text-slate-500 hover:text-slate-800 text-xs font-medium transition-colors flex items-center gap-2"
                    >
                        <span>{t('exploreOnly')}</span>
                        <span className="underline decoration-slate-600 underline-offset-4 hover:decoration-white">{t('backHome')}</span>
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function OnboardingPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-[#F4F6F8]" />}>
            <OnboardingContent />
        </Suspense>
    );
}

