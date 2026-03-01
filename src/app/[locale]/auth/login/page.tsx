'use client';

import { useState, Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { AuthService } from '@/services/auth.service';
import { Mail, Lock, LogIn, AlertCircle, Eye, EyeOff } from 'lucide-react';

const LOCALE_PREFIXES = ['/es', '/en', '/pt-BR'];

function LoginForm() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const locale = useLocale();
    const t = useTranslations('auth');
    const lp = (path: string) => `/${locale}${path}`;
    const searchParams = useSearchParams();
    const returnTo = searchParams.get('returnTo') || lp('/');

    const [email, setEmail] = useState(searchParams.get('email') || '');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Auto-redirect when user is already authenticated (e.g., after signInWithRedirect returns)
    useEffect(() => {
        if (!authLoading && user) {
            const redirect = (path: string) => { setTimeout(() => router.replace(path), 0); };
            const stored = sessionStorage.getItem('auth_redirect_to');
            if (stored) {
                sessionStorage.removeItem('auth_redirect_to');
                redirect(stored);
            } else {
                const hasLocalePrefix = LOCALE_PREFIXES.some(p => returnTo.startsWith(p));
                const target = returnTo && returnTo !== '/' && !hasLocalePrefix ? lp(returnTo) : returnTo || lp('/');
                redirect(target);
            }
        }
    }, [user, authLoading, returnTo, router, locale]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            await AuthService.loginWithEmail(email, password);
            const hasLocalePrefix = LOCALE_PREFIXES.some(p => returnTo.startsWith(p));
            const target = returnTo && returnTo !== '/' && !hasLocalePrefix
                ? lp(returnTo)
                : returnTo || lp('/');
            router.replace(target);
        } catch (err: any) {
            console.error(err);
            if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
                setError(t('errorInvalidCredentials'));
            } else if (err.code === 'auth/too-many-requests') {
                setError(t('errorTooManyRequests'));
            } else {
                setError(t('errorGeneral'));
            }
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setLoading(true);
        setError(null);
        try {
            const hasLocalePrefix = LOCALE_PREFIXES.some(p => returnTo.startsWith(p));
            const target = returnTo && returnTo !== '/' && !hasLocalePrefix ? lp(returnTo) : returnTo || lp('/');
            const loggedUser = await AuthService.loginWithGoogle(target);
            if (loggedUser) {
                // Desktop popup success — redirect immediately
                router.replace(target);
            }
            // Mobile redirect: page navigates away, no further action
        } catch (err: any) {
            console.error(err);
            if ((err as any).code === 'auth/unauthorized-domain') {
                setError('Dominio no autorizado. Contacta al administrador.');
            } else if ((err as any).code !== 'auth/popup-closed-by-user' && (err as any).code !== 'auth/cancelled-popup-request') {
                setError(t('errorGoogle'));
            }
        } finally {
            setLoading(false);
        }
    };

    const handleAppleLogin = async () => {
        setLoading(true);
        setError(null);
        try {
            const hasLocalePrefix = LOCALE_PREFIXES.some(p => returnTo.startsWith(p));
            const target = returnTo && returnTo !== '/' && !hasLocalePrefix ? lp(returnTo) : returnTo || lp('/');
            const loggedUser = await AuthService.loginWithApple(target);
            if (loggedUser) {
                router.replace(target);
            }
        } catch (err: any) {
            console.error(err);
            if ((err as any).code !== 'auth/popup-closed-by-user') {
                setError(t('errorGoogle'));
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white backdrop-blur-xl border border-slate-200 p-8 rounded-3xl shadow-2xl">
            <h2 className="text-xl font-bold text-slate-900 mb-2">{t('welcomeBack')}</h2>
            <p className="text-slate-400 text-sm mb-6">{t('enterData')}</p>

            {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 flex items-center gap-2 text-red-700 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Email</label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-[#F4F6F8] border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all"
                            placeholder="ejemplo@correo.com"
                        />
                    </div>
                </div>

                <div className="space-y-1">
                    <div className="flex justify-between items-center">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('password')}</label>
                        <Link
                            href={lp('/auth/forgot-password')}
                            className="text-xs text-[#0F766E] hover:text-[#0F9488] transition-colors">
                            {t('forgotPassword')}
                        </Link>
                    </div>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                        <input
                            type={showPassword ? 'text' : 'password'}
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-[#F4F6F8] border border-slate-200 rounded-xl py-3 pl-10 pr-10 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all"
                            placeholder="••••••••"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800 transition-colors focus:outline-none"
                            aria-label={showPassword ? t('hidePassword') : t('showPassword')}
                        >
                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-sm shadow-lg hover:shadow-cyan-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? (
                        <span className="w-5 h-5 border-2 border-slate-300 border-t-white rounded-full animate-spin"></span>
                    ) : (
                        <>
                            <LogIn className="w-4 h-4" />
                            {t('signIn')}
                        </>
                    )}
                </button>
            </form>

            <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-slate-500">{t('orContinueWith')}</span>
                </div>
            </div>

            <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-white text-slate-900 font-bold text-sm hover:bg-slate-100 transition-colors flex items-center justify-center gap-2"
            >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.26z" />
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                {t('continueWithGoogle')}
            </button>

            <button
                type="button"
                onClick={handleAppleLogin}
                disabled={loading}
                className="mt-3 w-full py-3.5 rounded-xl bg-black border border-slate-800 text-white font-bold text-sm hover:bg-slate-900 transition-colors flex items-center justify-center gap-2">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                </svg>
                {t('continueWithApple')}
            </button>

            <div className="mt-8 text-center">
                <p className="text-slate-400 text-sm">
                    {t('noAccount')}{' '}
                    <Link
                        href={lp(`/auth/register?returnTo=${encodeURIComponent(returnTo)}`)}
                        className="text-cyan-600 hover:text-[#0F766E] font-medium hover:underline">
                        {t('registerFree')}
                    </Link>
                </p>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div>...</div>}>
            <LoginForm />
        </Suspense>
    );
}
