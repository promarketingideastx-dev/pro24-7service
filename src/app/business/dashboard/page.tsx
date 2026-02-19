'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import GlassPanel from '@/components/ui/GlassPanel';
import AppointmentInbox from '@/components/business/AppointmentInbox';
import { Activity, Users, CalendarCheck, TrendingUp, Loader2 } from 'lucide-react';
import { AppointmentService, Appointment } from '@/services/appointment.service';

export default function DashboardPage() {
    const { user } = useAuth();
    const [stats, setStats] = useState({
        today: 0,
        pending: 0,
        clients: 0, // Placeholder for now
        revenue: 0  // Placeholder for now
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user?.uid) {
            fetchStats();
        }
    }, [user]);

    const fetchStats = async () => {
        try {
            // 1. Pending Requests
            const pending = await AppointmentService.getAppointmentsByStatus(user!.uid, 'pending');

            // 2. Today's Appointments (Confirmed)
            const confirmed = await AppointmentService.getAppointmentsByStatus(user!.uid, 'confirmed');
            const now = new Date();
            const todayStart = new Date(now.setHours(0, 0, 0, 0));
            const todayEnd = new Date(now.setHours(23, 59, 59, 999));

            const today = confirmed.filter(apt => {
                const d = apt.date.toDate();
                return d >= todayStart && d <= todayEnd;
            });

            setStats({
                today: today.length,
                pending: pending.length,
                clients: 0, // Need CustomerService logic
                revenue: 0  // Need revenue aggregation logic
            });
        } catch (error) {
            console.error("Error fetching dashboard stats:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-brand-neon-cyan" />
            </div>
        );
    }

    const statCards = [
        { label: 'Citas Hoy', value: stats.today.toString(), icon: <CalendarCheck className="text-cyan-400" />, change: 'Hoy' },
        { label: 'Solicitudes', value: stats.pending.toString(), icon: <Activity className="text-yellow-400" />, change: 'Pendientes' },
        { label: 'Clientes', value: '-', icon: <Users className="text-purple-400" />, change: 'Total' },
        { label: 'Ingresos', value: '-', icon: <TrendingUp className="text-green-400" />, change: 'Mes' },
    ];

    return (
        <div className="space-y-6 pb-20">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-white">Dashboard</h1>
                    <p className="text-slate-400 text-sm">Resumen de tu actividad en tiempo real</p>
                </div>
                <button
                    onClick={fetchStats}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm text-white transition-colors border border-white/10 flex items-center gap-2"
                >
                    <Activity size={14} />
                    Actualizar
                </button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {statCards.map((stat, i) => (
                    <GlassPanel key={i} className="p-4 flex flex-col gap-2 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                            {stat.icon}
                        </div>
                        <div className="flex justify-between items-start z-10">
                            <span className="text-slate-400 text-xs font-medium uppercase">{stat.label}</span>
                            {stat.icon}
                        </div>
                        <div className="flex items-baseline gap-2 z-10">
                            <span className="text-2xl font-bold text-white">{stat.value}</span>
                            <span className="text-xs text-brand-neon-cyan font-medium">{stat.change}</span>
                        </div>
                    </GlassPanel>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Inbox Area */}
                <div className="lg:col-span-2 space-y-4">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Activity size={20} className="text-brand-neon-cyan" />
                        Buzón de Citas
                    </h3>
                    <AppointmentInbox businessId={user!.uid} />
                </div>

                {/* Sidebar / Quick Actions (Future) */}
                <div className="space-y-4">
                    <GlassPanel className="p-6">
                        <h3 className="text-white font-bold mb-4">Acciones Rápidas</h3>
                        <div className="space-y-2">
                            <button className="w-full p-3 bg-white/5 hover:bg-white/10 rounded-lg text-left text-sm text-slate-300 hover:text-white transition-colors flex items-center gap-3">
                                <Users size={16} /> Agregar Cliente
                            </button>
                            <button className="w-full p-3 bg-white/5 hover:bg-white/10 rounded-lg text-left text-sm text-slate-300 hover:text-white transition-colors flex items-center gap-3">
                                <CalendarCheck size={16} /> Bloquear Horario
                            </button>
                        </div>
                    </GlassPanel>
                </div>
            </div>
        </div>
    );
}
