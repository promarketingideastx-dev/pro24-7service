'use client';

import { useState, Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { AuthService } from '@/services/auth.service';
import { UserService } from '@/services/user.service';
import { Mail, Lock, User, Phone, ArrowRight, LogIn, UserPlus, AlertCircle, Eye, EyeOff } from 'lucide-react';

const LOCALE_PREFIXES = ['/es', '/en', '/pt-BR'];

function AuthPortalForm() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const locale = useLocale();
    const t = useTranslations('auth');
    const lp = (path: string) => `/${locale}${path}`;
    const searchParams = useSearchParams();
    
    // Fallback if no intent or returnTo
    const intent = searchParams.get('intent');
    const returnTo = searchParams.get('returnTo') || (intent === 'business' ? lp('/business/pricing') : lp('/'));

    // Steps: 'email' (initial check) | 'login' (exists) | 'register' (new)
    const [step, setStep] = useState<'email' | 'login' | 'register'>('email');

    // Fields
    const [email, setEmail] = useState(searchParams.get('email') || '');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // States
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [suggestGoogleLink, setSuggestGoogleLink] = useState(false);

    // --- STEP 1: VERIFY EMAIL ---
    const handleEmailSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuggestGoogleLink(false);

        try {
            const exists = await AuthService.checkEmailExists(email);
            if (exists) {
                setStep('login');
            } else {
                setStep('register');
            }
        } catch (error) {
            console.error("Failed email check", error);
            setError(t('errorGeneral'));
        } finally {
            setLoading(false);
        }
    };

    // --- STEP 2A: LOGIN ---
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuggestGoogleLink(false);

        try {
            const loggedUser = await AuthService.loginWithEmail(email, password);
            
            // FASE 2B: We inject provider_intent if intent=business, even for existing accounts
            if (intent === 'business') {
                await UserService.setUserRole(loggedUser.uid, 'provider_intent');
                if (typeof window !== 'undefined') {
                    localStorage.setItem('pro247_user_mode', intent);
                }
            }
            // AuthGuard handles routing after hydration
        } catch (err: any) {
            console.error(err);
            if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
                try {
                    const exists = await AuthService.checkEmailExists(email);
                    if (exists) {
                        setSuggestGoogleLink(true);
                    }
                    setError(t('errorInvalidCredentials'));
                } catch (fallbackErr) {
                    setError(t('errorInvalidCredentials'));
                }
            } else if (err.code === 'auth/too-many-requests') {
                setError(t('errorTooManyRequests'));
            } else {
                setError(t('errorGeneral'));
            }
            setLoading(false);
        }
    };

    // --- STEP 2B: REGISTER ---
    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

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
            const result = await AuthService.registerWithEmail(email, password);
            const role: 'client' | 'provider_intent' = intent === 'business' ? 'provider_intent' : 'client';

            // Send welcome email background
            fetch('/api/welcome-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    name: name,
                    locale: locale || 'es',
                    role,
                }),
            }).catch(() => { /* silent */ });

            await UserService.setUserRole(result.uid, role);
            await UserService.updateUserProfile(result.uid, {
                displayName: name.trim(),
                phoneNumber: phone.trim()
            });

            if (typeof window !== 'undefined') {
                localStorage.setItem('pro247_user_mode', intent || 'client');
            }
            // AuthGuard will handle routing
        } catch (err: any) {
            console.error(err);
            if (err.code === 'auth/email-already-in-use') {
                setError(t('errorEmailExists'));
                setStep('login'); 
            } else if (err.code === 'auth/weak-password') {
                setError(t('errorWeakPassword'));
            } else {
                setError(t('errorRegister'));
            }
            setLoading(false);
        }
    };

    // --- SHARED SOCIAL LOGINS ---
    const handleGoogleLogin = async () => {
        setLoading(true);
        setError(null);
        try {
            const redirectAfterLogin = intent === 'business'
                ? lp('/pricing')
                : lp('/');
            
            const loggedUser = await AuthService.loginWithGoogle(redirectAfterLogin);
            if (!loggedUser) return; // Mobile redirect

            const profile = await UserService.getUserProfile(loggedUser.uid);
            
            // FASE 2B: Injection for Google accounts
            if (intent === 'business') {
                await UserService.setUserRole(loggedUser.uid, 'provider_intent');
            } else if (!profile?.role && !profile?.roles?.provider && !profile?.roles?.client) {
                await UserService.setUserRole(loggedUser.uid, 'client');
            }
            // Let AuthGuard route
        } catch (err: any) {
            console.error(err);
            if ((err as any).code === 'auth/unauthorized-domain') {
                setError('Dominio no autorizado.');
            } else if ((err as any).code !== 'auth/popup-closed-by-user') {
                setError(t('errorGoogle'));
            }
            setLoading(false);
        }
    };

    const handleAppleLogin = async () => {
        setLoading(true);
        setError(null);
        try {
            const loggedUser = await AuthService.loginWithApple(lp('/onboarding'));
            if (!loggedUser) return; 
            
            if (intent === 'business') {
                await UserService.setUserRole(loggedUser.uid, 'provider_intent');
            }
            // AuthGuard will handle routing
        } catch (err: any) {
            console.error(err);
            if ((err as any).code !== 'auth/popup-closed-by-user') {
                setError(t('errorGoogle'));
            }
            setLoading(false);
        }
    };

    return (
        <div className="bg-white/90 backdrop-blur-3xl border-[2px] border-slate-200/60 p-6 md:p-8 rounded-[2rem] shadow-[0_8px_30px_rgba(0,0,0,0.06)] relative overflow-hidden w-full max-w-md mx-auto">
            
            {/* dynamic headers based on step */}
            <h2 className="text-2xl md:text-3xl font-semibold text-slate-800 mb-2 tracking-tight" style={{ fontFamily: 'var(--font-outfit), sans-serif' }}>
                {step === 'email' ? 'Comencemos 🚀' : step === 'login' ? t('welcomeBack') : t('createAccount')}
            </h2>
            <p className="text-slate-500 font-medium text-sm md:text-base mb-6">
                {step === 'email' ? 'Ingresa tu correo para continuar.' : t('enterData')}
            </p>

            {error && !suggestGoogleLink && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 flex items-center gap-2 text-red-700 text-sm">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {/* Email Form */}
            {step === 'email' && (
                <form onSubmit={handleEmailSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-800 uppercase tracking-widest">Email</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-white/60 backdrop-blur-sm border-[1.5px] border-slate-300/80 rounded-xl py-3.5 pl-11 pr-4 text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:border-[#14B8A6] focus:ring-4 focus:ring-[#14B8A6]/10 transition-all shadow-sm"
                                placeholder="ejemplo@correo.com"
                            />
                        </div>
                    </div>
                    <button
                        type="submit"
                        disabled={loading || !email}
                        className="w-full mt-2 py-4 rounded-xl bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-700 hover:to-slate-800 text-white font-extrabold text-[15px] shadow-[0_8px_20px_rgba(15,23,42,0.25)] hover:shadow-[0_10px_25px_rgba(15,23,42,0.4)] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:grayscale-[50%] active:scale-[0.98]"
                    >
                        {loading ? <span className="w-5 h-5 border-2 border-slate-300 border-t-white rounded-full animate-spin"></span> : <>Continuar <ArrowRight className="w-4 h-4" /></>}
                    </button>
                </form>
            )}

            {/* Login Form */}
            {step === 'login' && (
                <div className="animate-in fade-in slide-in-from-right-4">
                    {error && suggestGoogleLink && (
                        <div className="mb-6 p-4 rounded-xl bg-blue-50 border border-blue-200 shadow-sm animate-in fade-in zoom-in-95 duration-300">
                            <div className="flex items-start gap-3 mb-3">
                                <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                                <p className="text-blue-800 text-sm leading-snug">
                                    {locale === 'en' 
                                    ? "It looks like this password is incorrect. If you originally created this account with Google, use the button below to sign in instantly." 
                                    : locale === 'pt-BR' 
                                    ? "Parece que essa senha está incorreta. Se você originalmente criou esta conta com o Google, use o botão abaixo para entrar instantaneamente."
                                    : "Parece que esta contraseña es incorrecta. Si creaste esta cuenta usando Google, presiona el botón de abajo para entrar al instante."}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={handleGoogleLogin}
                                disabled={loading}
                                className="w-full py-3.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                            >
                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.26z" />
                                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                </svg>
                                {t('continueWithGoogle')}
                            </button>
                        </div>
                    )}
                <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-800 uppercase tracking-widest">Email</label>
                        <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                            <Mail className="w-5 h-5 text-slate-400" />
                            <span className="flex-1 text-slate-700 font-medium truncate">{email}</span>
                            <button type="button" onClick={() => {setStep('email'); setError(null);}} className="text-[#14B8A6] text-xs font-bold hover:underline">Cambiar</button>
                        </div>
                    </div>
                    
                    <div className="space-y-1.5">
                        <div className="flex justify-between items-center">
                            <label className="text-xs font-bold text-slate-800 uppercase tracking-widest">{t('password')}</label>
                            <Link href={lp('/auth/forgot-password')} className="text-xs text-[#14B8A6] hover:text-[#0F766E] font-bold transition-colors">
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
                                className="w-full bg-white/60 backdrop-blur-sm border-[1.5px] border-slate-300/80 rounded-xl py-3.5 pl-11 pr-11 text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:border-[#14B8A6] focus:ring-4 focus:ring-[#14B8A6]/10 transition-all shadow-sm"
                                placeholder="••••••••"
                            />
                            <button type="button" onClick={(e) => { e.preventDefault(); setShowPassword(!showPassword); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 p-1">
                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>
                    <button type="submit" disabled={loading} className="w-full mt-2 py-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold transition-all flex items-center justify-center gap-2">
                        {loading ? <span className="w-5 h-5 border-2 border-slate-300 border-t-white rounded-full animate-spin"></span> : <><LogIn className="w-4 h-4" />{t('signIn')}</>}
                    </button>
                </form>
                </div>
            )}

            {/* Register Form */}
            {step === 'register' && (
                <form onSubmit={handleRegister} className="space-y-4 animate-in fade-in slide-in-from-right-4">
                    <div className="space-y-1.5">
                        <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                            <Mail className="w-5 h-5 text-slate-400" />
                            <span className="flex-1 text-slate-700 font-medium truncate">{email}</span>
                            <button type="button" onClick={() => {setStep('email'); setError(null);}} className="text-[#14B8A6] text-xs font-bold hover:underline">Cambiar</button>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-800 uppercase tracking-widest">{t('fullName')}</label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                            <input
                                type="text"
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full bg-white/60 border-[1.5px] border-slate-300/80 rounded-xl py-3 pl-11 pr-4"
                                placeholder="Ej: Juan Pérez"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-800 uppercase tracking-widest">{t('phone')}</label>
                        <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                            <input
                                type="tel"
                                required
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                className="w-full bg-white/60 border-[1.5px] border-slate-300/80 rounded-xl py-3 pl-11 pr-4"
                                placeholder="+1 234 567 8900"
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
                                className="w-full bg-white/60 border-[1.5px] border-slate-300/80 rounded-xl py-3 pl-11 pr-11"
                                placeholder="Mínimo 6 caracteres"
                            />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 p-1">
                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>

                    <button type="submit" disabled={loading} className="w-full mt-2 py-4 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white font-extrabold flex items-center justify-center gap-2">
                         {loading ? <span className="w-5 h-5 border-2 border-slate-300 border-t-white rounded-full animate-spin"></span> : <><UserPlus className="w-4 h-4" />Crear Cuenta</>}
                    </button>
                </form>
            )}

            {/* Social Logins - Only visible if step is email to not clutter the subviews? No, let's keep them visible globally unless they are in register/password entry state since that distracts. */}
            {step === 'email' && (
                <>
                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
                        <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-slate-500">{t('orContinueWith')}</span></div>
                    </div>

                    <button type="button" onClick={handleGoogleLogin} disabled={loading} className="w-full py-3.5 rounded-xl bg-white border-[1.5px] border-slate-200 text-slate-800 font-bold text-sm hover:bg-slate-50 flex items-center justify-center gap-2 mb-3">
                        <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.26z" /><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
                        {t('continueWithGoogle')}
                    </button>

                    <button type="button" onClick={handleAppleLogin} disabled={loading} className="w-full py-3.5 rounded-xl bg-black text-white font-bold text-sm hover:bg-gray-900 flex items-center justify-center gap-2">
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" /></svg>
                        {t('continueWithApple')}
                    </button>
                </>
            )}

        </div>
    );
}

export default function AuthPortalPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-[#F4F6F8] flex items-center justify-center"><div className="w-10 h-10 border-4 border-[#14B8A6] border-t-transparent rounded-full animate-spin"></div></div>}>
            <div className="min-h-screen flex items-center justify-center bg-[#F4F6F8] p-4 relative">
                {/* Background Decorators */}
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#14B8A6]/10 rounded-full blur-[100px] pointer-events-none"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none"></div>
                <AuthPortalForm />
            </div>
        </Suspense>
    );
}
