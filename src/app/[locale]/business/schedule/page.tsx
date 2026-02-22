'use client';

import GlassPanel from '@/components/ui/GlassPanel';

export default function SchedulePage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-white">Horario y Disponibilidad</h1>
                <p className="text-slate-400 text-sm">Define cuándo estás disponible para tus clientes</p>
            </div>

            <GlassPanel className="p-12 flex flex-col items-center justify-center min-h-[400px] text-center">
                <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-4">
                    <span className="text-4xl">📅</span>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Agenda de Trabajo</h3>
                <p className="text-slate-400 max-w-md mb-6">
                    Aquí configurarás tus días laborales, horas de apertura/cierre y días libres.
                </p>
                <div className="px-4 py-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-200 text-xs font-mono">
                    Phase 3D: Pending Implementation
                </div>
            </GlassPanel>
        </div>
    );
}
