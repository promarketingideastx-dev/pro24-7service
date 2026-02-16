'use client';

import GlassPanel from '@/components/ui/GlassPanel';
import { Plus } from 'lucide-react';

export default function ServicesPage() {
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-white">Mis Servicios</h1>
                    <p className="text-slate-400 text-sm">Gestiona tu menú de servicios</p>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-xl text-sm font-bold text-white hover:opacity-90 transition-opacity">
                    <Plus size={16} />
                    Nuevo Servicio
                </button>
            </div>

            <GlassPanel className="p-12 flex flex-col items-center justify-center min-h-[400px] text-center">
                <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-4">
                    <span className="text-4xl">✂️</span>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Catálogo de Servicios</h3>
                <p className="text-slate-400 max-w-md mb-6">
                    Aquí podrás agregar, editar y eliminar los servicios que ofreces, definir precios y duración.
                </p>
                <div className="px-4 py-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-200 text-xs font-mono">
                    Phase 3C: Pending Implementation
                </div>
            </GlassPanel>
        </div>
    );
}
