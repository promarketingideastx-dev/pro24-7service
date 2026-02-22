'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { AuthService } from '@/services/auth.service';
import { UserService } from '@/services/user.service';
import { Mail, Lock, UserPlus, AlertCircle, Eye, EyeOff } from 'lucide-react';

function RegisterForm() {
    const router = useRouter();
    const locale = useLocale();
    const t = useTranslations('auth');
    const lp = (path: string) => `/${locale}${path}`;
    const searchParams = useSearchParams();
    const returnTo = searchParams.get('returnTo') || lp('/');

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);


    const [emailCheckStatus, setEmailCheckStatus] = useState<'idle' | 'checking' | 'exists' | 'available'>('idle');

    // Email Exist Check
    const handleEmailBlur = async () => {
        if (!email || !email.includes('@')) return;

        setEmailCheckStatus('checking');
        try {
            const exists = await AuthService.checkEmailExists(email);
            if (exists) {
                setEmailCheckStatus('exists');
                // Optional: Clear other errors to focus on this
                setError(null);
            } else {
                setEmailCheckStatus('available');
            }
        } catch (error) {
            console.error("Failed email check", error);
            setEmailCheckStatus('idle');
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        // Pre-flight check if we haven't checked yet
        if (emailCheckStatus === 'idle') {
            // Logic to check could go here, but let's assume blur caught it or just let firebase throw error
            // Actually, the requirement says "Detect and redirect". 
            // If user rushed to click Submit without blur, we should check now.
            const exists = await AuthService.checkEmailExists(email);
            if (exists) {
                setEmailCheckStatus('exists');
                setLoading(false);
                return;
            }
        } else if (emailCheckStatus === 'exists') {
            setLoading(false);
            return; // Don't proceed
        }

        if (password !== confirmPassword) {
            setError(t('passwordMismatch'));
            setLoading(false);
            return;
        }

        if (password.length < 6) {
            setError(t('passwordTooShort'));
            setLoading(false);
            return;
        }

        try {
            const user = await AuthService.registerWithEmail(email, password);

            // Check for Intent
            const intent = searchParams.get('intent');

            if (intent === 'client' || intent === 'business') {
                const role = intent === 'business' ? 'provider' : 'client';
                await UserService.setUserRole(user.uid, role);

                // UX: Persist in local storage just in case
                if (typeof window !== 'undefined') {
                    localStorage.setItem('pro247_user_mode', intent);
                }

                if (role === 'provider') {
                    router.replace(lp('/business/setup'));
                } else {
                    router.replace(lp('/'));
                }
            } else {
                router.replace(lp('/onboarding'));
            }

        } catch (err: any) {
            // ... existing error handling
            console.error(err);
            if (err.code === 'auth/email-already-in-use') {
                setEmailCheckStatus('exists');
                setError(null);
            } else if (err.code === 'auth/invalid-email') {
                setError(t('errorEmailExists'));
            } else if (err.code === 'auth/weak-password') {
                setError(t('passwordTooShort'));
            } else {
                setError(t('errorRegister'));
            }
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setLoading(true);
        setError(null);
        try {
            const user = await AuthService.loginWithGoogle();
            // Check existing role to redirect correctly
            const profile = await UserService.getUserProfile(user.uid);
            const role = profile?.role;
            const isAdmin = profile?.roles?.admin === true;

            if (isAdmin) {
                router.replace(lp('/admin/dashboard'));
            } else if (role === 'provider') {
                router.replace(lp('/business/dashboard'));
            } else if (role === 'client') {
                router.replace(lp('/'));
            } else {
                // New user — needs to select role
                router.replace(lp('/onboarding'));
            }
        } catch (err: any) {
            console.error(err);
            setError(t('errorGoogle'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-[#151b2e]/80 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-2">{t('createAccount')} 🚀</h2>
            <p className="text-slate-400 text-sm mb-6">{t('enterData')}</p>

            {/* Email Exists Warning */}
            {emailCheckStatus === 'exists' && (
                <div className="mb-6 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-start gap-3">
                        <div className="p-2 bg-blue-500/20 rounded-full text-blue-400">
                            <UserPlus size={18} />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-blue-100 font-semibold text-sm mb-1">¡Esta cuenta ya existe!</h3>
                            <p className="text-blue-200/70 text-xs mb-3">
                                Parece que ya te has registrado con <strong>{email}</strong>.
                            </p>
                            <Link
                                href={lp(`/auth/login?email=${encodeURIComponent(email)}&returnTo=${encodeURIComponent(returnTo)}`)}
                                className="inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors"
                            >
                                Iniciar Sesión con este correo
                            </Link>
                        </div>
                    </div>
                </div>
            )}

            {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-red-200 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                </div>
            )}

            <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Email</label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => {
                                setEmail(e.target.value);
                                if (emailCheckStatus === 'exists') setEmailCheckStatus('idle'); // Reset on change
                            }}
                            onBlur={handleEmailBlur}
                            className={`w-full bg-[#0B0F19] border rounded-xl py-3 pl-10 pr-4 text-white placeholder:text-slate-600 focus:outline-none transition-all
                                ${emailCheckStatus === 'exists' ? 'border-blue-500/50 focus:border-blue-500' : 'border-white/10 focus:border-cyan-500/50'}
                            `}
                            placeholder="tucorreo@ejemplo.com"
                        />
                        {/* Loading Indicator inside input */}
                        {emailCheckStatus === 'checking' && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                <span className="block w-4 h-4 border-2 border-slate-500 border-t-brand-neon-cyan rounded-full animate-spin"></span>
                            </div>
                        )}
                    </div>
                </div>


                <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('password')}</label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                        <input
                            type={showPassword ? 'text' : 'password'}
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-[#0B0F19] border border-white/10 rounded-xl py-3 pl-10 pr-10 text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all"
                            placeholder="Mínimo 6 caracteres"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors focus:outline-none"
                            aria-label={showPassword ? t('hidePassword') : t('showPassword')}
                        >
                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>

                    </div>
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('confirmPassword')}</label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                        <input
                            type={showConfirmPassword ? 'text' : 'password'}
                            required
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full bg-[#0B0F19] border border-white/10 rounded-xl py-3 pl-10 pr-10 text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all"
                            placeholder="Repite tu contraseña"
                        />
                        <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors focus:outline-none"
                            aria-label={showConfirmPassword ? t('hidePassword') : t('showPassword')}
                        >
                            {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>


                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading || emailCheckStatus === 'checking'}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-sm shadow-lg hover:shadow-cyan-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading || emailCheckStatus === 'checking' ? (
                        <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    ) : (
                        <>
                            <UserPlus className="w-4 h-4" />
                            {t('createAccount')}
                        </>
                    )}
                </button>
            </form >


            <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/10"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-[#151b2e] px-2 text-slate-500">{t('orContinueWith')}</span>
                </div>
            </div>

            <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-white text-slate-900 font-bold text-sm hover:bg-slate-100 transition-colors flex items-center justify-center gap-2"
            >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                        fill="currentColor"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                        fill="currentColor"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                        fill="currentColor"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.26z"
                    />
                    <path
                        fill="currentColor"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                </svg>
                {t('continueWithGoogle')}
            </button>

            <div className="mt-8 text-center">
                <p className="text-slate-400 text-sm">
                    {t('haveAccount')}{' '}
                    <Link
                        href={lp(`/auth/login?returnTo=${encodeURIComponent(returnTo)}`)}
                        className="text-cyan-400 hover:text-cyan-300 font-medium hover:underline"
                    >
                        {t('loginHere')}
                    </Link>
                </p>
            </div>
        </div >
    );
}

export default function RegisterPage() {
    return (
        <Suspense fallback={<div>...</div>}>
            <RegisterForm />
        </Suspense>
    );
}
