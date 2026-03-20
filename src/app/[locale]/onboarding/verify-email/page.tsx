'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { Mail, RefreshCcw, LogOut } from 'lucide-react';
import { AuthService } from '@/services/auth.service';
import { useState } from 'react';

export default function VerifyEmailPage() {
    const { user } = useAuth();
    const router = useRouter();
    const locale = useLocale();
    const [sending, setSending] = useState(false);
    const [message, setMessage] = useState('');

    const handleResend = async () => {
        if (!user) return;
        setSending(true);
        try {
            const { sendEmailVerification } = await import('firebase/auth');
            await sendEmailVerification(user);
            setMessage('Correo de verificación reenviado. Revisa tu bandeja de entrada o spam.');
        } catch (error) {
            console.error(error);
            setMessage('Hubo un error enviando el correo. Intenta de nuevo más tarde.');
        }
        setSending(false);
    };

    const handleLogout = async () => {
        await AuthService.logout();
    };

    const handleHardRefresh = () => {
        window.location.reload();
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="bg-white max-w-md w-full rounded-2xl p-8 shadow-xl border border-slate-100 text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Mail className="w-8 h-8 text-blue-600" />
                </div>
                
                <h1 className="text-2xl font-bold text-slate-800 mb-2">Verifica tu correo electrónico</h1>
                <p className="text-slate-600 mb-6">
                    Hemos enviado un enlace de confirmación a <span className="font-semibold text-slate-800">{user?.email}</span>. 
                    Debes confirmar tu correo para proteger tu identidad y acceder a la plataforma.
                </p>

                {message && (
                    <div className="bg-green-50 text-green-800 p-3 rounded-lg text-sm font-medium mb-6">
                        {message}
                    </div>
                )}

                <div className="space-y-3">
                    <button 
                        onClick={handleHardRefresh}
                        className="w-full bg-[#14B8A6] hover:bg-[#0d9488] text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                    >
                        <RefreshCcw className="w-4 h-4" /> Ya lo verifiqué, continuar
                    </button>
                    
                    <button 
                        onClick={handleResend}
                        disabled={sending}
                        className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl transition-colors"
                    >
                        {sending ? 'Enviando...' : 'Reenviar correo'}
                    </button>

                    <button 
                        onClick={handleLogout}
                        className="w-full text-slate-500 hover:text-red-500 font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                    >
                        <LogOut className="w-4 h-4" /> Cerrar sesión
                    </button>
                </div>
            </div>
        </div>
    );
}
