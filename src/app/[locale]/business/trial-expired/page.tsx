'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useLocale } from 'next-intl';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { AlertCircle, ArrowRight, LogOut, CheckCircle } from 'lucide-react';

export default function TrialExpiredPage() {
    const { user, userProfile } = useAuth();
    const router = useRouter();
    const locale = useLocale();
    const [loading, setLoading] = useState(false);

    const subscriptionStatus = userProfile?.subscription?.status;
    const isWaitingForPayment = subscriptionStatus === 'requires_payment_method';

    const handleContinue = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, {
                'subscription.status': 'requires_payment_method'
            });
            // State updates automatically via AuthContext listener
            setLoading(false);
        } catch (error) {
            console.error("Error updating status:", error);
            setLoading(false);
        }
    };

    const handleCancel = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, {
                'subscription.status': 'canceled',
                // Optional: remove provider roles if you really want to kick them out,
                // but setting status to canceled is enough for BusinessGuard to block them.
                isBusinessActive: false
            });
            router.push(`/${locale}`);
        } catch (error) {
            console.error("Error canceling:", error);
            setLoading(false);
        }
    };

    if (isWaitingForPayment) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
                <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-100 p-8 text-center animate-in fade-in zoom-in duration-500">
                    <div className="w-16 h-16 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle className="w-8 h-8 text-teal-500" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 mb-4">¡Gracias por tu interés!</h1>
                    <p className="text-slate-600 mb-8 leading-relaxed">
                        Tu prueba gratuita ha terminado. Muy pronto habilitaremos la plataforma de pagos para que puedas activar tu plan y continuar disfrutando de todas las herramientas de Pro24/7.
                    </p>
                    <button
                        onClick={() => router.push(`/${locale}`)}
                        className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition-all"
                    >
                        Volver al Inicio
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-500">
                <div className="bg-red-500 p-8 text-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-10 -mt-10 blur-2xl"></div>
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-black opacity-10 rounded-full -ml-8 -mb-8 blur-xl"></div>
                    <div className="relative z-10 w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                        <AlertCircle className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="relative z-10 text-2xl font-bold text-white mb-2 tracking-tight">Periodo de Prueba Finalizado</h1>
                    <p className="relative z-10 text-red-100 text-sm">
                        Los 7 días de acceso gratuito a las herramientas de {userProfile?.selectedPlan === 'plus_team' ? 'Plus Equipo' : 'Premium'} han concluido.
                    </p>
                </div>
                
                <div className="p-8 space-y-6">
                    <p className="text-slate-600 text-center text-sm leading-relaxed">
                        Para seguir gestionando tu perfil profesional y recibiendo clientes, necesitas activar tu suscripción.
                    </p>

                    <div className="space-y-3">
                        <button
                            onClick={handleContinue}
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-2 py-4 bg-teal-500 hover:bg-teal-400 text-white rounded-xl font-bold transition-all shadow-md shadow-teal-500/20 active:scale-[0.98] disabled:opacity-70 disabled:scale-100"
                        >
                            {loading ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> : (
                                <>Activar mi Plan <ArrowRight size={18} /></>
                            )}
                        </button>

                        <button
                            onClick={handleCancel}
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-2 py-3.5 bg-white border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600 rounded-xl font-bold transition-all disabled:opacity-70"
                        >
                            {loading ? 'Cancelando...' : (
                                <><LogOut size={18} /> Cancelar y salir de Negocios</>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
