'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useAuth } from '@/context/AuthContext';
import { UserService } from '@/services/user.service';
import { AuthService } from '@/services/auth.service';
import { enableNetwork } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { toast } from 'sonner';
import { Search, Briefcase } from 'lucide-react';

export default function OnboardingPage() {
    const { user } = useAuth();
    const router = useRouter();
    const locale = useLocale();
    const t = useTranslations('onboarding');
    const lp = (path: string) => `/${locale}${path}`;
    const [loading, setLoading] = useState(false);

    const handleRoleSelection = async (role: 'client' | 'provider') => {
        // 1. Pre-Auth Logic: Redirect to Register with Intent
        if (!user) {
            router.push(lp(`/auth/register?intent=${role === 'provider' ? 'business' : 'client'}`));
            return;
        }

        // 2. Post-Auth Logic (Existing)
        setLoading(true);
        try {
            // 0. Force Online (Robustness)
            try {
                await enableNetwork(db);
            } catch (netErr) {
                console.warn("Could not force network online:", netErr);
            }

            // 1. Ensure Profile Exists & Saved Preference
            await UserService.createUserProfile(user.uid, user.email || '');

            // 2. Persist selection in localStorage for UX consistency
            if (typeof window !== 'undefined') {
                localStorage.setItem('pro247_user_mode', role === 'provider' ? 'business' : 'client');
            }

            // 3. Set Role in Backend
            await UserService.setUserRole(user.uid, role);

            // 4. Navigation
            if (role === 'provider') {
                router.push(lp('/business/setup'));
            } else {
                router.push(lp('/'));
            }
        } catch (error: any) {
            console.error("Error saving role:", error);
            if (error.message && error.message.includes("offline")) {
                toast.error(t('errorOffline'));
            } else {
                toast.error(t('errorSaving'));
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#0B0F19] p-6 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-500/10 rounded-full blur-[100px] pointer-events-none"></div>

            <div className="relative z-10 w-full max-w-2xl flex flex-col items-center">
                <h1 className="text-3xl md:text-4xl font-bold mb-2 text-white text-center">
                    {t('title').split('PRO24/7')[0]}<span className="text-brand-neon-cyan">PRO24/7</span>{t('title').split('PRO24/7')[1] ?? ''}
                </h1>
                <p className="text-slate-400 mb-10 text-center text-sm md:text-base">
                    {t('subtitle')}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                    {/* Client Option */}
                    <button
                        onClick={() => handleRoleSelection('client')}
                        disabled={loading}
                        className="flex flex-col items-center p-8 bg-[#151b2e]/60 backdrop-blur-md border border-white/10 rounded-3xl hover:border-brand-neon-cyan hover:bg-[#151b2e]/80 hover:shadow-[0_0_30px_rgba(0,240,255,0.15)] transition-all group text-left relative overflow-hidden"
                    >
                        <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                            <Search className="w-8 h-8 text-blue-400" />
                        </div>
                        <h2 className="text-xl font-bold mb-2 text-white">{t('clientTitle')}</h2>
                        <p className="text-slate-400 text-center text-xs leading-relaxed">
                            {t('clientDesc')}
                        </p>
                    </button>

                    {/* Provider Option */}
                    <button
                        onClick={() => handleRoleSelection('provider')}
                        disabled={loading}
                        className="flex flex-col items-center p-8 bg-[#151b2e]/60 backdrop-blur-md border border-white/10 rounded-3xl hover:border-green-400 hover:bg-[#151b2e]/80 hover:shadow-[0_0_30px_rgba(74,222,128,0.15)] transition-all group text-left relative overflow-hidden"
                    >
                        <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                            <Briefcase className="w-8 h-8 text-green-400" />
                        </div>
                        <h2 className="text-xl font-bold mb-2 text-white">{t('providerTitle')}</h2>
                        <p className="text-slate-400 text-center text-xs leading-relaxed">
                            {t('providerDesc')}
                        </p>
                    </button>
                </div>

                <div className="mt-12">
                    <button
                        onClick={() => {
                            // Allow exploring without role selection yet
                            router.push(lp('/'));
                        }}
                        className="text-slate-500 hover:text-white text-xs font-medium transition-colors flex items-center gap-2"
                    >
                        <span>{t('exploreOnly')}</span>
                        <span className="underline decoration-slate-600 underline-offset-4 hover:decoration-white">{t('backHome')}</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
