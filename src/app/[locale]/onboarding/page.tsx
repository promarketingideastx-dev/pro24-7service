'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useAuth } from '@/context/AuthContext';
import { UserService } from '@/services/user.service';
import { db } from '@/lib/firebase';
import { enableNetwork } from 'firebase/firestore';
import { toast } from 'sonner';
import { Search, Briefcase, MapPin, Crown } from 'lucide-react';
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

    const handleRoleSelection = async (role: 'client' | 'provider' | 'vip') => {
        let intent = 'client';
        if (role === 'provider') intent = 'business';
        if (role === 'vip') intent = 'vip';

        const returnParam = returnTo ? `&returnTo=${encodeURIComponent(returnTo)}` : '';

        // 1. Not logged in → send to login or register based on mode
        if (!user) {
            if (isLoginMode) {
                // If it's a VIP user trying to log in, standard login works fine, but we can pass intent
                router.push(lp(`/auth/login?intent=${intent}${returnParam}`));
            } else {
                if (role === 'vip') {
                    router.push(lp(`/auth/register/vip?intent=${intent}${returnParam}`));
                } else {
                    router.push(lp(`/auth/register?intent=${intent}${returnParam}`));
                }
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

            // Normal provider/client mode save
            if (role !== 'vip') {
                await UserService.setUserRole(user.uid, role);
            }

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

                <div className="flex flex-col gap-4 w-full px-2 mt-4">
                    {/* Client Option */}
                    <button
                        onClick={() => handleRoleSelection('client')}
                        disabled={loading}
                        className="w-full flex items-center p-4 border rounded-2xl transition-all cursor-pointer group overflow-hidden relative bg-blue-50/50 hover:bg-blue-50/80 border-[#E6E8EC] hover:border-blue-200 hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] text-left active:scale-[0.98]"
                    >
                        <div className="absolute left-0 top-0 bottom-0 w-1.5 rounded-l-2xl bg-blue-500" />
                        <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center mr-4 shrink-0 transition-transform group-hover:scale-110">
                            <Search className="w-6 h-6 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0 pr-2">
                            <h2 className="font-bold text-slate-900 text-sm md:text-base">{t('clientTitle')}</h2>
                            <p className="text-xs text-slate-500 mt-0.5 leading-snug line-clamp-2">
                                {t('clientDesc')}
                            </p>
                        </div>
                        <div className="shrink-0 flex flex-col items-center">
                            <div className="bg-white rounded-full p-1.5 shadow-sm border border-slate-100 group-hover:border-blue-200 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500 group-hover:translate-x-0.5 transition-transform"><path d="m9 18 6-6-6-6" /></svg>
                            </div>
                        </div>
                    </button>

                    {/* Provider Option */}
                    <button
                        onClick={() => handleRoleSelection('provider')}
                        disabled={loading}
                        className="w-full flex items-center p-4 border rounded-2xl transition-all cursor-pointer group overflow-hidden relative bg-pink-50/50 hover:bg-pink-50/80 border-[#E6E8EC] hover:border-pink-200 hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] text-left active:scale-[0.98]"
                    >
                        <div className="absolute left-0 top-0 bottom-0 w-1.5 rounded-l-2xl bg-pink-500" />
                        <div className="w-12 h-12 rounded-xl bg-pink-100 flex items-center justify-center mr-4 shrink-0 transition-transform group-hover:scale-110">
                            <Briefcase className="w-6 h-6 text-pink-600" />
                        </div>
                        <div className="flex-1 min-w-0 pr-2">
                            <h2 className="font-bold text-slate-900 text-sm md:text-base">{t('providerTitle')}</h2>
                            <p className="text-xs text-slate-500 mt-0.5 leading-snug line-clamp-2">
                                {t('providerDesc')}
                            </p>
                        </div>
                        <div className="shrink-0 flex flex-col items-center">
                            <div className="bg-white rounded-full p-1.5 shadow-sm border border-slate-100 group-hover:border-pink-200 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-pink-500 group-hover:translate-x-0.5 transition-transform"><path d="m9 18 6-6-6-6" /></svg>
                            </div>
                        </div>
                    </button>

                    {/* VIP Option */}
                    <button
                        onClick={() => handleRoleSelection('vip')}
                        disabled={loading || isLoginMode}
                        className={`w-full flex items-center p-4 border rounded-2xl transition-all cursor-pointer group overflow-hidden relative bg-purple-50/50 hover:bg-purple-50/80 border-[#E6E8EC] hover:border-purple-200 hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] text-left active:scale-[0.98] ${isLoginMode ? 'opacity-50 pointer-events-none hidden' : ''}`}
                    >
                        <div className="absolute left-0 top-0 bottom-0 w-1.5 rounded-l-2xl bg-purple-500" />
                        <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center mr-4 shrink-0 transition-transform group-hover:scale-110">
                            <Crown className="w-6 h-6 text-purple-600" />
                        </div>
                        <div className="flex-1 min-w-0 pr-2">
                            <h2 className="font-bold text-slate-900 text-sm md:text-base">{t('vipTitle')}</h2>
                            <p className="text-xs text-slate-500 mt-0.5 leading-snug line-clamp-2">
                                {t('vipDesc')}
                            </p>
                        </div>
                        <div className="shrink-0 flex flex-col items-center">
                            <div className="bg-white rounded-full p-1.5 shadow-sm border border-slate-100 group-hover:border-purple-200 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-purple-500 group-hover:translate-x-0.5 transition-transform"><path d="m9 18 6-6-6-6" /></svg>
                            </div>
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

