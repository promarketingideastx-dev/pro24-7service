'use client';

import { useState, Suspense, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { AuthService } from '@/services/auth.service';
import { UserService } from '@/services/user.service';
import { useAuth } from '@/context/AuthContext';
import { VipInviteService } from '@/services/vipInvite.service';
import { Mail, Lock, UserPlus, AlertCircle, Eye, EyeOff, User, Phone, KeyRound } from 'lucide-react';

function VipRegisterForm() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const locale = useLocale();
    const t = useTranslations('auth');
    const lp = (path: string) => `/${locale}${path}`;
    const searchParams = useSearchParams();
    const returnTo = searchParams.get('returnTo') || lp('/');
    const redirectingRef = useRef(false);

    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [inviteCode, setInviteCode] = useState('');

    // Toggle between 'email' based invite or 'code' based invite validation
    const [hasPreApprovedEmail, setHasPreApprovedEmail] = useState(false);

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [emailCheckStatus, setEmailCheckStatus] = useState<'idle' | 'checking' | 'exists' | 'available'>('idle');

    useEffect(() => {
        if (!authLoading && user && !redirectingRef.current) {
            router.replace(lp('/'));
        }
    }, [user, authLoading, lp, router]);

    const handleEmailBlur = async () => {
        if (!email || !email.includes('@')) return;

        setEmailCheckStatus('checking');
        try {
            // Check auth collisions
            const exists = await AuthService.checkEmailExists(email);
            if (exists) {
                setEmailCheckStatus('exists');
                setError(null);
                setHasPreApprovedEmail(false);
                return;
            } else {
                setEmailCheckStatus('available');
            }

            // Check if this new email is pre-approved for VIP
            const invite = await VipInviteService.getInviteByEmail(email);
            if (invite) {
                setHasPreApprovedEmail(true);
            } else {
                setHasPreApprovedEmail(false);
            }
        } catch (error) {
            console.error("Failed email check", error);
            setEmailCheckStatus('idle');
            setHasPreApprovedEmail(false);
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        if (emailCheckStatus === 'idle') {
            await handleEmailBlur();
            if (emailCheckStatus === 'exists') {
                setLoading(false);
                return;
            }
        } else if (emailCheckStatus === 'exists') {
            setLoading(false);
            return;
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
            // VIP VALIDATION BEFORE CREATING ACCOUNT
            let validInviteId = null;

            if (hasPreApprovedEmail) {
                const invite = await VipInviteService.getInviteByEmail(email);
                if (!invite) throw new Error('Invitación expirada o inválida para este correo.');
                validInviteId = invite.id;
            } else {
                if (!inviteCode.trim()) {
                    throw new Error('No tienes un correo preaprobado. Ingresa un código VIP.');
                }
                const invite = await VipInviteService.getInviteByCode(inviteCode.trim());
                if (!invite) throw new Error('Código VIP inválido o ya utilizado.');
                validInviteId = invite.id;
            }

            // CREATION
            const newUser = await AuthService.registerWithEmail(email, password);

            // Redeem VIP invite
            await VipInviteService.redeemInvite(validInviteId, newUser.uid);

            // Configure Profile
            const role = 'provider'; // VIP Collaborators act in the provider ecosystem
            redirectingRef.current = true;

            await UserService.setUserRole(newUser.uid, role);
            await UserService.updateUserProfile(newUser.uid, {
                displayName: name.trim(),
                phoneNumber: phone.trim(),
                isVip: true, // Mark as VIP
            });

            if (typeof window !== 'undefined') {
                localStorage.setItem('pro247_user_mode', 'business');
            }

            // Redirect to business setup (The setup process will grant them Premium plan because isVip=true)
            router.replace(lp('/business/setup'));

        } catch (err: any) {
            console.error(err);
            if (err.message.includes('inválido') || err.message.includes('Código') || err.message.includes('correo')) {
                setError(err.message);
            } else if (err.code === 'auth/email-already-in-use') {
                setEmailCheckStatus('exists');
                setError(null);
            } else if (err.code === 'auth/invalid-email') {
                setError(t('errorEmailExists'));
            } else if (err.code === 'auth/weak-password') {
                setError(t('passwordTooShort'));
            } else {
                setError(t('errorRegister') || 'Error al completar el registro.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white/90 backdrop-blur-3xl border-[2px] border-slate-200/60 p-6 md:p-8 rounded-[2rem] shadow-[0_8px_30px_rgba(0,0,0,0.06)] relative overflow-hidden">
            <div className="flex items-center gap-3 mb-2">
                <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-1 rounded">VIP</span>
                <h2
                    className="text-2xl md:text-3xl font-semibold text-slate-800 tracking-tight"
                    style={{ fontFamily: 'var(--font-outfit), sans-serif' }}
                >
                    Registro VIP
                </h2>
            </div>

            <p className="text-slate-500 font-medium text-sm md:text-base mb-6">
                Ingresa con tu correo preaprobado o ingresa tu código de acceso.
            </p>

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

            {hasPreApprovedEmail && emailCheckStatus === 'available' && !error && (
                <div className="mb-6 p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm animate-in fade-in slide-in-from-top-2">
                    <strong>¡Correo Preaprobado!</strong> Puedes continuar tu registro VIP sin código extra.
                </div>
            )}

            {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 flex items-center gap-2 text-red-700 text-sm">
                    <AlertCircle className="shrink-0 w-4 h-4" />
                    <span>{error}</span>
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
                                if (emailCheckStatus === 'exists') setEmailCheckStatus('idle');
                                if (hasPreApprovedEmail) setHasPreApprovedEmail(false);
                            }}
                            onBlur={handleEmailBlur}
                            className={`w-full bg-white/60 backdrop-blur-sm border-[1.5px] rounded-xl py-3.5 pl-11 pr-4 text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:ring-4 transition-all shadow-sm
                                ${emailCheckStatus === 'exists' ? 'border-blue-500/50 focus:border-blue-500 focus:ring-blue-500/10' : 'border-slate-300/80 focus:border-blue-500 focus:ring-blue-500/10'}
                            `}
                            placeholder="tucorreo@ejemplo.com"
                        />
                        {emailCheckStatus === 'checking' && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                <span className="block w-4 h-4 border-2 border-slate-500 border-t-[#14B8A6] rounded-full animate-spin"></span>
                            </div>
                        )}
                    </div>
                </div>

                {emailCheckStatus === 'available' && !hasPreApprovedEmail && (
                    <div className="space-y-1.5 animate-in fade-in">
                        <label className="text-xs font-bold text-purple-800 uppercase tracking-widest flex items-center gap-1">
                            <KeyRound size={14} /> Código VIP Requerido
                        </label>
                        <input
                            type="text"
                            required
                            value={inviteCode}
                            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                            className="w-full bg-purple-50/50 border-[1.5px] border-purple-200 rounded-xl py-3.5 px-4 text-slate-900 font-bold placeholder:text-purple-300 focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all shadow-sm"
                            placeholder="Ej. PRO-XYZ123"
                        />
                        <p className="text-xs text-slate-500 mt-1">Como tu correo no está preaprobado, necesitas un código válido para acceder.</p>
                    </div>
                )}

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
                    className="w-full mt-2 py-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-[15px] shadow-[0_8px_20px_rgba(245,158,11,0.25)] hover:shadow-[0_10px_25px_rgba(245,158,11,0.4)] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:grayscale-[50%] disabled:cursor-wait active:scale-[0.98]"
                >
                    {loading || emailCheckStatus === 'checking' ? (
                        <span className="w-5 h-5 border-2 border-stone-300 border-t-white rounded-full animate-spin"></span>
                    ) : (
                        <>
                            <UserPlus className="w-4 h-4" />
                            Activar Cuenta VIP
                        </>
                    )}
                </button>
            </form >
        </div >
    );
}

export default function VipRegisterPage() {
    return (
        <Suspense fallback={<div>...</div>}>
            <VipRegisterForm />
        </Suspense>
    );
}
