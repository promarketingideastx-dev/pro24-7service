'use client';

import { X, Lock, LogIn, UserPlus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';

interface AuthGateModalProps {
    isOpen: boolean;
    onClose: () => void;
    businessName: string;
    metrics: {
        rating: number;
        reviews: number;
    };
    returnUrl: string;
}

export default function AuthGateModal({ isOpen, onClose, businessName, metrics, returnUrl }: AuthGateModalProps) {
    const router = useRouter();
    const locale = useLocale();
    const t = useTranslations('authGate');
    const lp = (path: string) => `/${locale}${path}`;

    if (!isOpen) return null;

    const handleLogin = () => {
        // Redirigir a login con returnUrl (asumiendo que implementaremos la lógica de returnUrl en login)
        // Por ahora, solo simular o ir a login genérico
        router.push(lp(`/auth/login?returnTo=${encodeURIComponent(returnUrl)}`));
    };

    const handleRegister = () => {
        router.push(lp(`/auth/register?returnTo=${encodeURIComponent(returnUrl)}`));
    };

    return (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="relative bg-white w-full max-w-md rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col animate-in scale-95 duration-200">

                {/* Background Decor */}
                <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-brand-neon-cyan/20 to-transparent opacity-50 pointer-events-none"></div>

                <div className="relative p-8 flex flex-col items-center text-center z-10">

                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-800 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(255,255,255,0.1)]">
                        <Lock className="w-8 h-8 text-brand-neon-cyan" />
                    </div>

                    <h2 className="text-2xl font-bold text-white mb-2">
                        {t('title')}
                    </h2>

                    <p className="text-slate-400 mb-6 leading-relaxed">
                        {t('desc', { business: businessName, reviews: metrics.reviews })}
                    </p>

                    <div className="w-full space-y-3">
                        <button
                            onClick={handleRegister}
                            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-base shadow-lg hover:shadow-cyan-500/25 transition-all flex items-center justify-center gap-2"
                        >
                            <UserPlus className="w-5 h-5" />
                            {t('createAccount')}
                        </button>

                        <button
                            onClick={handleLogin}
                            className="w-full py-3.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-white font-medium text-base transition-all flex items-center justify-center gap-2"
                        >
                            <LogIn className="w-5 h-5 text-slate-400" />
                            {t('signIn')}
                        </button>
                    </div>

                    <p className="text-[10px] text-slate-500 mt-6">
                        {t('secureNote')}
                    </p>

                </div>
            </div>
        </div>
    );
}
