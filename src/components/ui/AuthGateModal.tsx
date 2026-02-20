'use client';

import { X, Lock, LogIn, UserPlus } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface AuthGateModalProps {
    isOpen: boolean;
    onClose: () => void;
    businessName: string;
    metrics: {
        rating: number;
        reviews: number;
    };
    returnUrl: string;
}

export default function AuthGateModal({ isOpen, onClose, businessName, metrics, returnUrl }: AuthGateModalProps) {
    const router = useRouter();

    if (!isOpen) return null;

    const handleLogin = () => {
        // Redirigir a login con returnUrl (asumiendo que implementaremos la lógica de returnUrl en login)
        // Por ahora, solo simular o ir a login genérico
        router.push(`/auth/login?returnTo=${encodeURIComponent(returnUrl)}`);
    };

    const handleRegister = () => {
        router.push(`/auth/register?returnTo=${encodeURIComponent(returnUrl)}`);
    };

    return (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="relative bg-[#1e3a5f] w-full max-w-md rounded-3xl border border-white/10 shadow-2xl overflow-hidden flex flex-col animate-in scale-95 duration-200">

                {/* Background Decor */}
                <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-brand-neon-cyan/20 to-transparent opacity-50 pointer-events-none"></div>

                <div className="relative p-8 flex flex-col items-center text-center z-10">

                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(255,255,255,0.1)]">
                        <Lock className="w-8 h-8 text-brand-neon-cyan" />
                    </div>

                    <h2 className="text-2xl font-bold text-white mb-2">
                        Acceso a Perfil
                    </h2>

                    <p className="text-slate-400 mb-6 leading-relaxed">
                        Para ver la galería completa, contactar a <span className="text-white font-semibold">{businessName}</span> y leer sus <span className="text-white font-semibold">{metrics.reviews} reseñas verificadas</span>, necesitas una cuenta.
                    </p>

                    <div className="w-full space-y-3">
                        <button
                            onClick={handleRegister}
                            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-base shadow-lg hover:shadow-cyan-500/25 transition-all flex items-center justify-center gap-2"
                        >
                            <UserPlus className="w-5 h-5" />
                            Crear Cuenta Gratis
                        </button>

                        <button
                            onClick={handleLogin}
                            className="w-full py-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium text-base transition-all flex items-center justify-center gap-2"
                        >
                            <LogIn className="w-5 h-5 text-slate-400" />
                            Iniciar Sesión
                        </button>
                    </div>

                    <p className="text-[10px] text-slate-500 mt-6">
                        🔒 Tus datos están protegidos. Solo toma 30 segundos.
                    </p>

                </div>
            </div>
        </div>
    );
}
