'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useAuth } from '@/context/AuthContext';
import { UserService } from '@/services/user.service';
import { db } from '@/lib/firebase';
import { enableNetwork } from 'firebase/firestore';
import { toast } from 'sonner';
import { Search, Briefcase } from 'lucide-react';

function OnboardingContent() {
    const { user } = useAuth();
    const router = useRouter();
    const locale = useLocale();
    const t = useTranslations('onboarding');
    const lp = (path: string) => `/${locale}${path}`;
    const searchParams = useSearchParams();
    const [loading, setLoading] = useState(false);

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

            await UserService.createUserProfile(user.uid, user.email || '');

            if (typeof window !== 'undefined') {
                localStorage.setItem('pro247_user_mode', role === 'provider' ? 'business' : 'client');
            }

            await UserService.setUserRole(user.uid, role);

            if (role === 'provider') {
                router.push(lp('/business/setup'));
            } else {
                router.push(lp(returnTo || '/'));
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
            {/* Background Effects */}
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-500/10 rounded-full blur-[100px] pointer-events-none"></div>

            <div className="relative z-10 w-full max-w-2xl flex flex-col items-center">
                <h1 className="text-3xl md:text-4xl font-bold mb-2 text-white text-center">
                    {isLoginMode ? (
                        <>¿Cómo usas <span className="text-brand-neon-cyan">Pro24/7YA</span>?</>
                    ) : (
                        <>Únete a <span className="text-brand-neon-cyan">Pro24/7YA</span></>
                    )}
                </h1>
                <p className="text-slate-400 mb-10 text-center text-sm md:text-base">
                    {isLoginMode
                        ? 'Selecciona tu perfil para continuar con el inicio de sesión.'
                        : t('subtitle')
                    }
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                    {/* Client Option */}
                    <button
                        onClick={() => handleRoleSelection('client')}
                        disabled={loading}
                        className="flex flex-col items-center p-8 bg-white/60 backdrop-blur-md border border-slate-200 rounded-3xl hover:border-brand-neon-cyan hover:bg-slate-500 hover:shadow-[0_0_30px_rgba(0,240,255,0.15)] transition-all group text-left relative overflow-hidden"
                    >
                        <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                            <Search className="w-8 h-8 text-blue-400" />
                        </div>
                        <h2 className="text-xl font-bold mb-2 text-white">{t('clientTitle')}</h2>
                        <p className="text-slate-400 text-center text-xs leading-relaxed">
                            {t('clientDesc')}
                        </p>
                        <div className="mt-6 px-4 py-2 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-400 text-xs font-bold">
                            {isLoginMode ? 'Iniciar sesión como cliente →' : 'Crear cuenta gratis →'}
                        </div>
                    </button>

                    {/* Provider Option */}
                    <button
                        onClick={() => handleRoleSelection('provider')}
                        disabled={loading}
                        className="flex flex-col items-center p-8 bg-white/60 backdrop-blur-md border border-slate-200 rounded-3xl hover:border-green-400 hover:bg-slate-500 hover:shadow-[0_0_30px_rgba(74,222,128,0.15)] transition-all group text-left relative overflow-hidden"
                    >
                        <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                            <Briefcase className="w-8 h-8 text-green-400" />
                        </div>
                        <h2 className="text-xl font-bold mb-2 text-white">{t('providerTitle')}</h2>
                        <p className="text-slate-400 text-center text-xs leading-relaxed">
                            {t('providerDesc')}
                        </p>
                        <div className="mt-6 px-4 py-2 rounded-full border border-green-500/30 bg-green-500/10 text-green-400 text-xs font-bold">
                            {isLoginMode ? 'Iniciar sesión como negocio →' : 'Registrar mi negocio →'}
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

