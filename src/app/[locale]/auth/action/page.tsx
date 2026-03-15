'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { verifyPasswordResetCode, confirmPasswordReset } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Lock, CheckCircle2, AlertCircle, Eye, EyeOff, KeyRound } from 'lucide-react';
import Link from 'next/link';

function ActionHandler() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const locale = useLocale();
    const t = useTranslations('auth.action');
    const lp = (path: string) => `/${locale}${path}`;

    // Firebase oobCode parameters
    const mode = searchParams.get('mode');
    const oobCode = searchParams.get('oobCode');

    // UI State
    const [status, setStatus] = useState<'verifying' | 'valid' | 'invalid' | 'success'>('verifying');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form State
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [verifiedEmail, setVerifiedEmail] = useState<string | null>(null);

    useEffect(() => {
        if (!mode || !oobCode) {
            setStatus('invalid');
            return;
        }

        // Si ya tuvimos éxito en la sesión actual con este código, no lo volvemos a verificar 
        // para evitar que devuelva "inválido" porque Firebase ya lo consumió.
        if (sessionStorage.getItem(`reset_success_${oobCode}`) === 'true') {
            setStatus('success');
            return;
        }

        if (mode === 'resetPassword') {
            // Verify the link immediately upon loading
            verifyPasswordResetCode(auth, oobCode)
                .then((email) => {
                    setVerifiedEmail(email);
                    setStatus('valid');
                })
                .catch((err) => {
                    console.error("Link verification failed", err);
                    setStatus('invalid');
                });
        } else {
            // Other modes (like email verification) not supported in this screen for now
            setStatus('invalid');
        }
    }, [mode, oobCode]);

    const handlePasswordReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (password.length < 8) {
            setError(t('passwordTooShort'));
            return;
        }

        if (password !== confirm) {
            setError(t('passwordMismatch'));
            return;
        }

        setLoading(true);
        try {
            await confirmPasswordReset(auth, oobCode!, password);
            sessionStorage.setItem(`reset_success_${oobCode}`, 'true');
            setStatus('success');
        } catch (err: any) {
            console.error('Error resetting password:', err);
            // Si por alguna razón de red falla o el código expiró en el proceso
            setStatus('invalid');
        } finally {
            setLoading(false);
        }
    };

    if (status === 'verifying') {
        return (
            <div className="bg-white backdrop-blur-xl border border-slate-200 p-8 rounded-3xl shadow-2xl text-center">
                <div className="w-16 h-16 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto mb-4">
                    <div className="w-6 h-6 border-2 border-slate-300 border-t-cyan-500 rounded-full animate-spin"></div>
                </div>
                <h2 className="text-xl font-bold text-slate-900 mb-2">{t('verifying')}</h2>
            </div>
        );
    }

    if (status === 'invalid') {
        return (
            <div className="bg-white backdrop-blur-xl border border-slate-200 p-8 rounded-3xl shadow-2xl text-center">
                <div className="w-16 h-16 rounded-full bg-red-50 border border-red-100 flex items-center justify-center mx-auto mb-4 text-red-500">
                    <AlertCircle className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 mb-2">{t('invalidLinkTitle')}</h2>
                <p className="text-slate-500 text-sm mb-6 max-w-sm mx-auto">
                    {t('invalidLinkDesc')}
                </p>
                <Link
                    href={lp('/auth/forgot-password')}
                    className="inline-flex py-3 px-6 rounded-xl font-bold text-white bg-[#14B8A6] hover:bg-[#0f9488] shadow-lg shadow-teal-500/20 active:scale-95 transition-all"
                >
                    {t('requestNewLink')}
                </Link>
            </div>
        );
    }

    if (status === 'success') {
        return (
            <div className="bg-white backdrop-blur-xl border border-slate-200 p-8 rounded-3xl shadow-2xl text-center">
                <div className="w-16 h-16 rounded-full bg-green-50 border border-green-100 flex items-center justify-center mx-auto mb-4 text-green-500">
                    <CheckCircle2 className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 mb-2">{t('successTitle')}</h2>
                <p className="text-slate-500 text-sm mb-6 max-w-sm mx-auto">
                    {t('successDesc')}
                </p>
                <Link
                    href={lp('/auth/login')}
                    className="inline-flex py-3 px-6 rounded-xl font-bold text-white bg-[#14B8A6] hover:bg-[#0f9488] shadow-lg shadow-teal-500/20 active:scale-95 transition-all"
                >
                    {t('goToLogin')}
                </Link>
            </div>
        );
    }

    // Status: VALID -> Show password form
    return (
        <div className="bg-white/90 backdrop-blur-3xl border-[2px] border-slate-200/60 p-6 md:p-8 rounded-[2rem] shadow-[0_8px_30px_rgba(0,0,0,0.06)] relative overflow-hidden">
            <h2 className="text-2xl md:text-3xl font-semibold text-slate-800 mb-2 tracking-tight" style={{ fontFamily: 'var(--font-outfit), sans-serif' }}>
                {t('newPasswordTitle')}
            </h2>
            <p className="text-slate-500 font-medium text-sm md:text-base mb-6">
                {verifiedEmail ? (
                    <span className="block mb-1 text-slate-400 text-xs font-semibold uppercase tracking-wider">{verifiedEmail}</span>
                ) : null}
                {t('newPasswordDesc')}
            </p>

            {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 flex items-center gap-2 text-red-700 text-sm">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {error}
                </div>
            )}

            <form onSubmit={handlePasswordReset} className="space-y-4">
                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-800 uppercase tracking-widest">{t('newPasswordLabel')}</label>
                    <div className="relative">
                        <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                        <input
                            type={showPassword ? 'text' : 'password'}
                            required
                            minLength={8}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-white/60 backdrop-blur-sm border-[1.5px] border-slate-300/80 rounded-xl py-3.5 pl-11 pr-11 text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 transition-all shadow-sm"
                            placeholder={t('newPasswordPlaceholder')}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800 transition-colors focus:outline-none p-1"
                        >
                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-800 uppercase tracking-widest">{t('confirmPasswordLabel')}</label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                        <input
                            type={showConfirm ? 'text' : 'password'}
                            required
                            minLength={8}
                            value={confirm}
                            onChange={(e) => setConfirm(e.target.value)}
                            className={`w-full bg-white/60 backdrop-blur-sm border-[1.5px] ${confirm && password !== confirm ? 'border-red-400 focus:border-red-500 focus:ring-red-500/10' : 'border-slate-300/80 focus:border-cyan-500 focus:ring-cyan-500/10'} rounded-xl py-3.5 pl-11 pr-11 text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:ring-4 transition-all shadow-sm`}
                            placeholder={t('confirmPasswordPlaceholder')}
                        />
                        <button
                            type="button"
                            onClick={() => setShowConfirm(!showConfirm)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800 transition-colors focus:outline-none p-1"
                        >
                            {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading || password.length < 8 || password !== confirm}
                    className="w-full mt-4 py-4 rounded-xl bg-gradient-to-r from-cyan-600 to-[#14B8A6] hover:from-cyan-700 hover:to-[#0f9488] text-white font-extrabold text-[15px] shadow-[0_8px_20px_rgba(20,184,166,0.25)] hover:shadow-[0_10px_25px_rgba(20,184,166,0.4)] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:grayscale-[50%] disabled:cursor-not-allowed active:scale-[0.98]"
                >
                    {loading ? (
                        <span className="w-5 h-5 border-2 border-slate-300 border-t-white rounded-full animate-spin"></span>
                    ) : (
                        t('updatePassword')
                    )}
                </button>
            </form>
        </div>
    );
}

export default function AuthActionPage() {
    return (
        <Suspense fallback={
            <div className="bg-white backdrop-blur-xl border border-slate-200 p-8 rounded-3xl shadow-2xl text-center">
                <div className="w-16 h-16 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto mb-4">
                    <div className="w-6 h-6 border-2 border-slate-300 border-t-cyan-500 rounded-full animate-spin"></div>
                </div>
            </div>
        }>
            <ActionHandler />
        </Suspense>
    );
}
