'use client';

import { useState, Suspense } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { AuthService } from '@/services/auth.service';
import { Mail, ArrowLeft, CheckCircle2, AlertCircle, Send } from 'lucide-react';

function ForgotPasswordForm() {
    const locale = useLocale();
    const t = useTranslations('auth');
    const lp = (path: string) => `/${locale}${path}`;

    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            await AuthService.sendPasswordReset(email);
            setSent(true);
        } catch (err: any) {
            if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-email') {
                // For security, we still show success even if email not found
                setSent(true);
            } else if (err.code === 'auth/too-many-requests') {
                setError(t('errorTooManyRequests'));
            } else {
                setError(t('errorGeneral'));
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white backdrop-blur-xl border border-slate-200 p-8 rounded-3xl shadow-2xl">

            {/* Back link */}
            <Link
                href={lp('/auth/login')}
                className="inline-flex items-center gap-2 text-slate-400 hover:text-slate-800 text-sm mb-6 transition-colors group"
            >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                {t('backToLogin')}
            </Link>

            {/* Success State */}
            {sent ? (
                <div className="text-center py-4">
                    <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 className="w-8 h-8 text-green-400" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 mb-2">{t('resetEmailSentTitle')}</h2>
                    <p className="text-slate-400 text-sm leading-relaxed mb-6">
                        {t('resetEmailSentDesc').replace('{email}', email)}
                    </p>
                    <Link
                        href={lp('/auth/login')}
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-100 hover:bg-slate-100 border border-slate-200 text-white text-sm font-medium transition-all"
                    >
                        {t('backToLogin')}
                    </Link>
                </div>
            ) : (
                <>
                    <h2 className="text-xl font-bold text-slate-900 mb-2">{t('forgotPasswordTitle')}</h2>
                    <p className="text-slate-400 text-sm mb-6">{t('forgotPasswordDesc')}</p>

                    {error && (
                        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-red-200 text-sm">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                <input
                                    type="email"
                                    required
                                    autoFocus
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-[#F4F6F8] border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all"
                                    placeholder="ejemplo@correo.com"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !email}
                            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-sm shadow-lg hover:shadow-cyan-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <span className="w-5 h-5 border-2 border-slate-300 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <Send className="w-4 h-4" />
                                    {t('sendResetEmail')}
                                </>
                            )}
                        </button>
                    </form>
                </>
            )}
        </div>
    );
}

export default function ForgotPasswordPage() {
    return (
        <Suspense fallback={<div />}>
            <ForgotPasswordForm />
        </Suspense>
    );
}
