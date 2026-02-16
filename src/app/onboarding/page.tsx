'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { UserService } from '@/services/user.service';
import { AuthService } from '@/services/auth.service';
import { enableNetwork } from 'firebase/firestore'; // Import enableNetwork
import { db } from '@/lib/firebase'; // Import db instance

export default function OnboardingPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const handleRoleSelection = async (role: 'client' | 'provider') => {
        if (!user) {
            alert("Error: No se encontró usuario autenticado. Por favor, intenta iniciar sesión de nuevo.");
            return;
        }

        setLoading(true);
        try {
            // 0. Force Online (Try to recover connection)
            try {
                await enableNetwork(db);
            } catch (netErr) {
                console.warn("Could not force network online:", netErr);
            }

            // 1. Ensure Profile Exists
            await UserService.createUserProfile(user.uid, user.email || '');

            // 2. Set Role
            await UserService.setUserRole(user.uid, role);

            // 3. Navigation
            if (role === 'provider') {
                router.push('/business/setup');
            } else {
                router.push('/');
            }
        } catch (error: any) {
            console.error("Onboarding Error:", error);

            const errorMessage = error?.message || (typeof error === 'string' ? error : JSON.stringify(error));

            // Helpful message for Offline error
            if (errorMessage.includes("client is offline")) {
                alert(`Tu conexión es inestable. Intenta recargar la página.`);
            } else {
                alert(`Hubo un error al guardar tu selección. Por favor intenta de nuevo.`);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#0B0F19] p-6 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-500/10 rounded-full blur-[100px] pointer-events-none"></div>

            <div className="relative z-10 w-full max-w-4xl flex flex-col items-center">
                <h1 className="text-3xl md:text-4xl font-bold mb-2 text-white text-center">¿Cómo quieres usar PRO24/7?</h1>
                <p className="text-slate-400 mb-10 text-center text-sm md:text-base">Selecciona tu perfil para personalizar tu experiencia</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                    {/* Client Option */}
                    <button
                        onClick={() => handleRoleSelection('client')}
                        disabled={loading}
                        className="flex flex-col items-center p-8 bg-[#151b2e]/60 backdrop-blur-md border border-white/10 rounded-3xl hover:border-brand-neon-cyan hover:bg-[#151b2e]/80 hover:shadow-[0_0_30px_rgba(0,240,255,0.15)] transition-all group group text-left relative overflow-hidden"
                    >
                        <div className="w-20 h-20 rounded-full bg-blue-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                            <span className="text-4xl">🔍</span>
                        </div>
                        <h2 className="text-xl font-bold mb-3 text-white">Busco Servicios</h2>
                        <p className="text-slate-400 text-center text-sm leading-relaxed">
                            Necesito encontrar profesionales, técnicos o servicios para mi hogar o negocio.
                        </p>
                    </button>

                    {/* Provider Option */}
                    <button
                        onClick={() => handleRoleSelection('provider')}
                        disabled={loading}
                        className="flex flex-col items-center p-8 bg-[#151b2e]/60 backdrop-blur-md border border-white/10 rounded-3xl hover:border-green-400 hover:bg-[#151b2e]/80 hover:shadow-[0_0_30px_rgba(74,222,128,0.15)] transition-all group text-left relative overflow-hidden"
                    >
                        <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                            <span className="text-4xl">🛠️</span>
                        </div>
                        <h2 className="text-xl font-bold mb-3 text-white">Ofrezco Servicios</h2>
                        <p className="text-slate-400 text-center text-sm leading-relaxed">
                            Soy un profesional o tengo un negocio y quiero conseguir más clientes.
                        </p>
                    </button>
                </div>

                <div className="mt-12">
                    <button
                        onClick={async () => {
                            await AuthService.logout();
                            router.push('/');
                        }}
                        className="text-slate-500 hover:text-white text-sm font-medium transition-colors flex items-center gap-2"
                    >
                        <span>¿Solo quieres explorar?</span>
                        <span className="underline decoration-slate-600 underline-offset-4 hover:decoration-white">Volver al Inicio (Cerrar Sesión)</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
