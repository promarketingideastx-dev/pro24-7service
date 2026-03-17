'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import GlassPanel from '@/components/ui/GlassPanel';
import { Check, ArrowRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { UserService } from '@/services/user.service';
import { useState } from 'react';

export default function PricingPage() {
    const t = useTranslations('setup'); // Using setup translations temporarily
    const router = useRouter();
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);

    const handleSelectFreePlan = async () => {
        if (!user) return;
        setLoading(true);
        try {
            // Update the onboarding status to the next step
            await UserService.updateUserProfile(user.uid, {
                providerOnboardingStatus: 'pending_setup'
            } as any); // using any here because we typed it on the generic interface, but updateDoc takes partial
            
            router.push('/business/setup');
        } catch (error) {
            console.error('Error updating plan:', error);
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#F4F6F8] flex items-center justify-center p-4 md:p-8">
            <div className="max-w-4xl w-full mx-auto space-y-8">
                <div className="text-center space-y-2">
                    <h1 className="text-3xl md:text-4xl font-bold text-slate-800" style={{ fontFamily: 'var(--font-outfit)' }}>
                        Selecciona tu Plan
                    </h1>
                    <p className="text-slate-500 font-medium">
                        (Fase 2A - Esqueleto temporal de Pricing)
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
                    {/* Free Plan Skeleton */}
                    <GlassPanel className="p-8 flex flex-col items-center text-center space-y-6 border-2 border-transparent hover:border-cyan-500 transition-all cursor-pointer">
                        <div className="p-4 bg-cyan-100 rounded-2xl">
                            <Check className="w-8 h-8 text-cyan-600" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-2xl font-bold text-slate-800" style={{ fontFamily: 'var(--font-outfit)' }}>Básico</h3>
                            <p className="text-slate-500 text-sm">Empieza gratis, 14 días de prueba en funciones pro.</p>
                        </div>
                        <ul className="text-sm text-slate-600 space-y-3 text-left w-full">
                            <li className="flex items-center gap-2"><Check className="w-4 h-4 text-cyan-500" /> Perfil Básico</li>
                            <li className="flex items-center gap-2"><Check className="w-4 h-4 text-cyan-500" /> Recepción de citas</li>
                        </ul>
                        <button 
                            onClick={handleSelectFreePlan}
                            disabled={loading}
                            className="w-full py-3 mt-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                        >
                            {loading ? 'Cargando...' : 'Elegir Básico'} <ArrowRight className="w-4 h-4" />
                        </button>
                    </GlassPanel>
                </div>
            </div>
        </div>
    );
}
