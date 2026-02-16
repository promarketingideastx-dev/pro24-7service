'use client';

import GlassPanel from '@/components/ui/GlassPanel';
import { Activity, Users, CalendarCheck, TrendingUp } from 'lucide-react';

export default function DashboardPage() {
    const stats = [
        { label: 'Citas Hoy', value: '0', icon: <CalendarCheck className="text-cyan-400" />, change: '+0%' },
        { label: 'Clientes', value: '0', icon: <Users className="text-purple-400" />, change: '+0%' },
        { label: 'Ingresos', value: 'L. 0', icon: <TrendingUp className="text-green-400" />, change: '+0%' },
        { label: 'Visitas', value: '0', icon: <Activity className="text-blue-400" />, change: '+0%' },
    ];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-white">Dashboard</h1>
                    <p className="text-slate-400 text-sm">Resumen de tu actividad</p>
                </div>
                <button className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm text-white transition-colors border border-white/10">
                    Actualizar
                </button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {stats.map((stat, i) => (
                    <GlassPanel key={i} className="p-4 flex flex-col gap-2">
                        <div className="flex justify-between items-start">
                            <span className="text-slate-400 text-xs font-medium uppercase">{stat.label}</span>
                            {stat.icon}
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-white">{stat.value}</span>
                            <span className="text-xs text-green-400 font-medium">{stat.change}</span>
                        </div>
                    </GlassPanel>
                ))}
            </div>

            {/* Content Placeholder */}
            <GlassPanel className="p-12 flex flex-col items-center justify-center min-h-[400px] text-center border-dashed border-white/20">
                <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-4 text-slate-500">
                    <Activity size={32} />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Actividad Reciente</h3>
                <p className="text-slate-400 max-w-sm mb-4">
                    Aquí se mostrarán las próximas citas y notificaciones importantes de tu negocio.
                </p>
                <div className="px-4 py-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-200 text-xs font-mono">
                    Phase 3D: Pending Implementation
                </div>
            </GlassPanel>
        </div>
    );
}
