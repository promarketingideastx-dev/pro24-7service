'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { ShieldAlert, X } from 'lucide-react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { toast } from 'sonner';
import { useTranslations, useLocale } from 'next-intl';

export default function PasswordOptInBanner() {
    const { user, loading } = useAuth();
    const t = useTranslations('auth');
    const locale = useLocale();
    const [visible, setVisible] = useState(false);
    const [sending, setSending] = useState(false);

    useEffect(() => {
        if (loading || !user) return;

        const hasPassword = user.providerData.some(p => p.providerId === 'password');
        const hasDismissed = localStorage.getItem(`pw_optin_dismissed_${user.uid}`);

        if (!hasPassword && !hasDismissed) {
            // Esperamos unos segundos para no interrumpir la navegación primaria de onboarding
            const timer = setTimeout(() => setVisible(true), 2500);
            return () => clearTimeout(timer);
        }
    }, [user, loading]);

    if (!visible || !user || !user.email) return null;

    const handleSendLink = async () => {
        setSending(true);
        try {
            await sendPasswordResetEmail(auth, user.email!);
            toast.success(
                locale === 'en' ? 'Link sent!' : (locale === 'pt-BR' ? 'Link enviado!' : '¡Enlace enviado!'),
                {
                    description: locale === 'en' 
                        ? 'Check your email to set a password.' 
                        : (locale === 'pt-BR' 
                            ? 'Verifique seu e-mail para criar uma senha.' 
                            : 'Revisa tu correo electrónico para crear tu contraseña.'),
                }
            );
            handleDismiss();
        } catch (error) {
            console.error(error);
            toast.error(locale === 'en' ? 'Error sending link.' : 'Error al enviar enlace.');
            setSending(false);
        }
    };

    const handleDismiss = () => {
        localStorage.setItem(`pw_optin_dismissed_${user.uid}`, 'true');
        setVisible(false);
    };

    return (
        <div className="fixed top-24 left-4 right-4 md:left-auto md:right-6 md:w-96 z-50 bg-slate-900 border border-slate-700 rounded-2xl shadow-[0_20px_40px_rgba(0,0,0,0.4)] p-4 flex items-start gap-4 animate-in fade-in slide-in-from-top-10 duration-500">
            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex flex-shrink-0 items-center justify-center mt-0.5">
                <ShieldAlert className="w-5 h-5 text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-white text-[15px] font-bold tracking-tight">
                    {locale === 'en' ? 'Secure your Account' : (locale === 'pt-BR' ? 'Proteja sua Conta' : 'Asegura tu Cuenta')}
                </p>
                <p className="text-slate-300 text-xs mt-1 leading-relaxed pr-2">
                    {locale === 'en' 
                        ? 'You only use Google/Apple to log in right now. Add a password to ensure access if you lose your social account.' 
                        : (locale === 'pt-BR' 
                            ? 'Você só usa Google/Apple no momento. Crie uma senha para garantir o acesso caso perca sua conta social.' 
                            : 'Actualmente solo ingresas con Google/Apple. Añade una contraseña para garantizar el acceso en caso de perder tu cuenta social.')}
                </p>
                <button
                    onClick={handleSendLink}
                    disabled={sending}
                    className="mt-3.5 w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-colors disabled:opacity-50 shadow-sm active:scale-[0.98]"
                >
                    {sending 
                        ? (locale === 'en' ? 'Sending...' : 'Enviando...') 
                        : (locale === 'en' ? 'Send link to create password' : (locale === 'pt-BR' ? 'Enviar link para criar senha' : 'Enviar enlace para crear contraseña'))
                    }
                </button>
            </div>
            <button
                onClick={handleDismiss}
                className="text-slate-500 hover:text-white transition-colors shrink-0 -mt-1 -mr-1 p-2"
                aria-label="Cerrar"
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    );
}
