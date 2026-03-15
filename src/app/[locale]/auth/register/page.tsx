'use client';

import { useState, Suspense, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { AuthService } from '@/services/auth.service';
import { UserService } from '@/services/user.service';
import { useAuth } from '@/context/AuthContext';
import { Mail, Lock, UserPlus, AlertCircle, Eye, EyeOff, User, Phone } from 'lucide-react';

function RegisterForm() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const locale = useLocale();
    const t = useTranslations('auth');
    const lp = (path: string) => `/${locale}${path}`;
    const searchParams = useSearchParams();
    const returnTo = searchParams.get('returnTo') || lp('/');
    // Prevents the useEffect redirect from firing when handleRegister/handleGoogle already redirected
    const redirectingRef = useRef(false);

    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fallback redirect: only fires if no explicit redirect was already triggered
    // (e.g. after mobile Google signInWithRedirect returns)
    useEffect(() => {
        if (!authLoading && user && !redirectingRef.current) {
            const stored = sessionStorage.getItem('auth_redirect_to');
            if (stored) {
                sessionStorage.removeItem('auth_redirect_to');
                router.replace(stored);
            } else {
                router.replace(lp('/onboarding'));
            }
        }
    }, [user, authLoading]);


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

        if (!name.trim() || !phone.trim()) {
            setError(t('errorRequiredFields', { fallback: 'Nombre y Teléfono son obligatorios.' }));
            setLoading(false);
            return;
        }

        try {
            const user = await AuthService.registerWithEmail(email, password);

            // Check for Intent
            const intent = searchParams.get('intent');
            const role: 'client' | 'provider' = intent === 'business' ? 'provider' : 'client';

            // Send welcome email (fire-and-forget — never breaks the flow)
            fetch('/api/welcome-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    name: name,
                    locale: locale || 'es',
                    role,
                }),
            }).catch(() => { /* silently ignore email errors */ });

            // Mark that we are handling the redirect ourselves
            redirectingRef.current = true;

            if (intent === 'client' || intent === 'business') {
                await UserService.setUserRole(user.uid, role);
                await UserService.updateUserProfile(user.uid, {
                    displayName: name.trim(),
                    phoneNumber: phone.trim()
                });

                if (typeof window !== 'undefined') {
                    localStorage.setItem('pro247_user_mode', intent);
                }

                if (role === 'provider') {
                    router.replace(lp('/business/setup'));
                } else {
                    router.replace(lp('/'));
                }
            } else {
                // No intent → go to home (already has profile from Firebase Auth)
                router.replace(lp('/'));
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
                setError(t('errorWeakPassword'));
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
            const intent = searchParams.get('intent');
            // Store redirect target in session so the mobile redirect flow picks it up
            const redirectAfterLogin = intent === 'business'
                ? lp('/business/setup')
                : intent === 'client'
                    ? lp('/')
                    : lp('/onboarding');

            const loggedUser = await AuthService.loginWithGoogle(redirectAfterLogin);
            if (!loggedUser) return; // Mobile redirect flow — page navigates away

            // Desktop popup: check existing role to redirect correctly
            redirectingRef.current = true;
            const profile = await UserService.getUserProfile(loggedUser.uid);
            const role = profile?.role;
            const isAdmin = profile?.isAdmin === true;

            if (isAdmin) {
                router.replace(lp('/admin/dashboard'));
            } else if (role === 'provider') {
                router.replace(lp('/business/dashboard'));
            } else if (role === 'client') {
                router.replace(lp('/'));
            } else if (intent === 'business') {
                // New user via Google with business intent
                await UserService.setUserRole(loggedUser.uid, 'provider');
                router.replace(lp('/business/setup'));
            } else {
                // New user via Google — go home (client by default)
                await UserService.setUserRole(loggedUser.uid, 'client');
                router.replace(lp('/'));
            }
        } catch (err: any) {
            console.error(err);
            if ((err as any).code === 'auth/unauthorized-domain') {
                setError('Dominio no autorizado. Contacta al administrador.');
            } else if ((err as any).code !== 'auth/popup-closed-by-user') {
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
            const loggedUser = await AuthService.loginWithApple(lp('/onboarding'));
            if (!loggedUser) return; // Mobile: redirect in progress

            const profile = await UserService.getUserProfile(loggedUser.uid);
            const role = profile?.role;
            const isAdmin = profile?.isAdmin === true;
            if (isAdmin) {
                router.replace(lp('/admin/dashboard'));
            } else if (role === 'provider') {
                router.replace(lp('/business/dashboard'));
            } else if (role === 'client') {
                router.replace(lp('/'));
            } else {
                router.replace(lp('/onboarding'));
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
        <div className="bg-white/90 backdrop-blur-3xl border-[2px] border-slate-200/60 p-6 md:p-8 rounded-[2rem] shadow-[0_8px_30px_rgba(0,0,0,0.06)] relative overflow-hidden">
            <h2
                className="text-2xl md:text-3xl font-semibold text-slate-800 mb-2 tracking-tight"
                style={{ fontFamily: 'var(--font-outfit), sans-serif' }}
            >
                {t('createAccount')} 🚀
            </h2>
            <p className="text-slate-500 font-medium text-sm md:text-base mb-6">{t('enterData')}</p>

            {/* Email Exists Warning */}
            {emailCheckStatus === 'exists' && (
                <div className="mb-6 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-start gap-3">
                        <div className="p-2 bg-blue-500/20 rounded-full text-blue-400">
                            <UserPlus size={18} />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-blue-800 font-semibold text-sm mb-1">¡Esta cuenta ya existe!</h3>
                            <p className="text-blue-600 text-xs mb-3">
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
                <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 flex items-center gap-2 text-red-700 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                </div>
            )}

            <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-800 uppercase tracking-widest">Email</label>
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
                            className={`w-full bg-white/60 backdrop-blur-sm border-[1.5px] rounded-xl py-3.5 pl-11 pr-4 text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:ring-4 transition-all shadow-sm
                                ${emailCheckStatus === 'exists' ? 'border-blue-500/50 focus:border-blue-500 focus:ring-blue-500/10' : 'border-slate-300/80 focus:border-blue-500 focus:ring-blue-500/10'}
                            `}
                            placeholder="tucorreo@ejemplo.com"
                        />
                        {/* Loading Indicator inside input */}
                        {emailCheckStatus === 'checking' && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                <span className="block w-4 h-4 border-2 border-slate-500 border-t-[#14B8A6] rounded-full animate-spin"></span>
                            </div>
                        )}
                    </div>
                </div>


                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-800 uppercase tracking-widest">{t('fullName', { fallback: 'Nombre Completo' })}</label>
                    <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                        <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-white/60 backdrop-blur-sm border-[1.5px] border-slate-300/80 rounded-xl py-3.5 pl-11 pr-4 text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm"
                            placeholder="Ej. Juan Pérez"
                        />
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-800 uppercase tracking-widest">{t('phone', { fallback: 'Teléfono' })}</label>
                    <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                        <input
                            type="tel"
                            required
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="w-full bg-white/60 backdrop-blur-sm border-[1.5px] border-slate-300/80 rounded-xl py-3.5 pl-11 pr-4 text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm"
                            placeholder="+1 234 567 890"
                        />
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-800 uppercase tracking-widest">{t('password')}</label>

                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                        <input
                            type={showPassword ? 'text' : 'password'}
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-white/60 backdrop-blur-sm border-[1.5px] border-slate-300/80 rounded-xl py-3.5 pl-11 pr-11 text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm"
                            placeholder="Mínimo 6 caracteres"
                        />
                        <button
                            type="button"
                            onClick={(e) => { e.preventDefault(); setShowPassword(!showPassword); }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800 transition-colors focus:outline-none p-1"
                            aria-label={showPassword ? t('hidePassword') : t('showPassword')}
                        >
                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>

                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-800 uppercase tracking-widest">{t('confirmPassword')}</label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                        <input
                            type={showConfirmPassword ? 'text' : 'password'}
                            required
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full bg-white/60 backdrop-blur-sm border-[1.5px] border-slate-300/80 rounded-xl py-3.5 pl-11 pr-11 text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm"
                            placeholder="Repite tu contraseña"
                        />
                        <button
                            type="button"
                            onClick={(e) => { e.preventDefault(); setShowConfirmPassword(!showConfirmPassword); }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800 transition-colors focus:outline-none p-1"
                            aria-label={showConfirmPassword ? t('hidePassword') : t('showPassword')}
                        >
                            {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>


                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading || emailCheckStatus === 'checking'}
                    className="w-full mt-2 py-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-[15px] shadow-[0_8px_20px_rgba(37,99,235,0.25)] hover:shadow-[0_10px_25px_rgba(37,99,235,0.4)] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:grayscale-[50%] disabled:cursor-wait active:scale-[0.98]"
                >
                    {loading || emailCheckStatus === 'checking' ? (
                        <span className="w-5 h-5 border-2 border-slate-300 border-t-white rounded-full animate-spin"></span>
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
                className="w-full py-3.5 rounded-xl bg-white border-[1.5px] border-slate-200 text-slate-800 font-bold text-sm hover:bg-slate-50 hover:border-slate-300 shadow-sm transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
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

            <button
                type="button"
                onClick={handleAppleLogin}
                disabled={loading}
                className="mt-3 w-full py-3.5 rounded-xl bg-[#000000] text-white font-bold text-sm hover:bg-[#1a1a1a] shadow-md transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
            >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                </svg>
                {t('continueWithApple')}
            </button>

            <div className="mt-8 text-center">
                <p className="text-slate-400 text-sm">
                    {t('haveAccount')}{' '}
                    <Link
                        href={lp(`/auth/login?returnTo=${encodeURIComponent(returnTo)}`)}
                        className="text-cyan-600 hover:text-[#0F766E] font-medium hover:underline"
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
