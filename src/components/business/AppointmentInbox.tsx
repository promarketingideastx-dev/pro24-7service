'use client';

import { useState, useEffect } from 'react';
import { Appointment, AppointmentService, AppointmentStatus } from '@/services/appointment.service';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar, Clock, CheckCircle, XCircle, AlertCircle, User, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useAppointmentRefresh } from '@/context/AppointmentRefreshContext';

interface AppointmentInboxProps {
    businessId: string;
}

export default function AppointmentInbox({ businessId }: AppointmentInboxProps) {
    const [activeTab, setActiveTab] = useState<'pending' | 'upcoming' | 'history'>('pending');
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const { triggerRefresh } = useAppointmentRefresh();

    const fetchAppointments = async () => {
        setLoading(true);
        try {
            // Fetch all and filter/sort client-side for now to reduce reads/complexity
            // In a real app, you'd fetch by status separately or use a compound query
            // Strategy: 
            // - Pending: status == 'pending'
            // - Upcoming: status == 'confirmed' && date >= now
            // - History: status in ['completed', 'cancelled', 'no-show'] OR (status == 'confirmed' && date < now)

            // For MVP, let's fetch 'pending' specifically if tab is pending, etc.
            // But relying on AppointmentService.getAppointmentsByStatus might be easier.

            let data: Appointment[] = [];

            if (activeTab === 'pending') {
                data = await AppointmentService.getAppointmentsByStatus(businessId, 'pending');
            } else if (activeTab === 'upcoming') {
                data = await AppointmentService.getAppointmentsByStatus(businessId, 'confirmed');
                // Filter for future dates only
                const now = new Date();
                data = data.filter(a => a.date.toDate() >= now);
            } else {
                // History: confirmed (past), completed, cancelled, no-show
                const cancelled = await AppointmentService.getAppointmentsByStatus(businessId, 'cancelled');
                const completed = await AppointmentService.getAppointmentsByStatus(businessId, 'completed');
                const noshow = await AppointmentService.getAppointmentsByStatus(businessId, 'no-show');
                const confirmed = await AppointmentService.getAppointmentsByStatus(businessId, 'confirmed');

                const now = new Date();
                const pastConfirmed = confirmed.filter(a => a.date.toDate() < now);

                data = [...cancelled, ...completed, ...noshow, ...pastConfirmed];
            }

            // Sort by date (desc for history, asc for upcoming/pending)
            data.sort((a, b) => {
                const dateA = a.date.toDate().getTime();
                const dateB = b.date.toDate().getTime();
                return activeTab === 'history' ? dateB - dateA : dateA - dateB;
            });

            setAppointments(data);
        } catch (error) {
            console.error("Error fetching inbox:", error);
            toast.error("Error al cargar citas");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (businessId) {
            fetchAppointments();
        }
    }, [businessId, activeTab]);

    const handleStatusUpdate = async (appointmentId: string, newStatus: AppointmentStatus) => {
        setProcessingId(appointmentId);
        try {
            await AppointmentService.updateStatus(appointmentId, newStatus);

            // Optimistic update: update local state immediately without waiting for fetchAppointments
            setAppointments(prev =>
                prev.map(a =>
                    a.id === appointmentId ? { ...a, status: newStatus } : a
                )
            );

            const label = newStatus === 'confirmed' ? 'aceptada' :
                newStatus === 'cancelled' ? 'rechazada' :
                    newStatus === 'completed' ? 'marcada como completada' : 'actualizada';
            toast.success(`Cita ${label} exitosamente`);

            // Signal Agenda page to re-fetch (cross-page bridge)
            triggerRefresh();

            // Refresh Inbox list
            fetchAppointments();
        } catch (error) {
            console.error("Error updating status:", error);
            toast.error("No se pudo actualizar la cita");
        } finally {
            setProcessingId(null);
        }
    };

    const tabs = [
        { id: 'pending', label: 'Pendientes', icon: <AlertCircle size={16} /> },
        { id: 'upcoming', label: 'Próximas', icon: <Calendar size={16} /> },
        { id: 'history', label: 'Historial', icon: <Clock size={16} /> },
    ];

    return (
        <div className="bg-[#151b2e]/50 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-sm">
            {/* Tabs Header */}
            <div className="flex border-b border-white/10">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-medium transition-colors relative
                            ${activeTab === tab.id ? 'text-white bg-white/5' : 'text-slate-400 hover:text-white hover:bg-white/5'}
                        `}
                    >
                        {tab.icon}
                        {tab.label}
                        {activeTab === tab.id && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-neon-cyan shadow-[0_0_10px_rgba(0,240,255,0.5)]" />
                        )}
                    </button>
                ))}
            </div>

            {/* List Content */}
            <div className="p-4 min-h-[300px]">
                {loading ? (
                    <div className="flex justify-center items-center h-48 text-slate-500 animate-pulse">
                        Cargando...
                    </div>
                ) : appointments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 text-slate-500">
                        <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3">
                            <Clock size={20} className="text-slate-600" />
                        </div>
                        <p>No hay citas en esta sección.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {appointments.map((apt) => (
                            <div
                                key={apt.id}
                                className="bg-white/5 border border-white/5 rounded-xl p-4 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center hover:bg-white/10 transition-colors"
                            >
                                {/* Info */}
                                <div className="flex items-start gap-4">
                                    <div className={`p-3 rounded-full ${apt.status === 'confirmed' ? 'bg-green-500/10 text-green-500' :
                                        apt.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500' :
                                            'bg-slate-500/10 text-slate-500'
                                        }`}>
                                        <User size={20} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-white text-lg">{apt.customerName}</h4>
                                        <div className="flex flex-col gap-1 mt-1 text-sm text-slate-400">
                                            <div className="flex items-center gap-2">
                                                <Calendar size={14} className="text-brand-neon-cyan" />
                                                <span className="text-slate-300">
                                                    {format(apt.date.toDate(), 'PPP', { locale: es })}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Clock size={14} className="text-purple-400" />
                                                <span>
                                                    {format(apt.date.toDate(), 'p', { locale: es })}
                                                </span>
                                                <span className="text-slate-600">•</span>
                                                <span className="text-white font-medium">{apt.serviceName}</span>
                                            </div>
                                            {apt.notes && (
                                                <div className="flex items-start gap-2 mt-1 px-2 py-1 bg-black/20 rounded text-xs italic">
                                                    <MessageCircle size={12} className="mt-0.5 shrink-0" />
                                                    "{apt.notes}"
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                {activeTab === 'pending' && (
                                    <div className="flex items-center gap-2 w-full md:w-auto mt-2 md:mt-0">
                                        <button
                                            onClick={() => handleStatusUpdate(apt.id!, 'cancelled')}
                                            disabled={!!processingId}
                                            className="flex-1 md:flex-none px-4 py-2 rounded-lg border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                                        >
                                            Rechazar
                                        </button>
                                        <button
                                            onClick={() => handleStatusUpdate(apt.id!, 'confirmed')}
                                            disabled={!!processingId}
                                            className="flex-1 md:flex-none px-4 py-2 rounded-lg bg-green-500 text-black font-bold hover:shadow-[0_0_15px_rgba(34,197,94,0.4)] transition-all disabled:opacity-50"
                                        >
                                            {processingId === apt.id ? '...' : 'Aceptar'}
                                        </button>
                                    </div>
                                )}

                                {activeTab !== 'pending' && (
                                    <div className={`shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${apt.status === 'confirmed'
                                        ? 'border-green-500/30 text-green-400 bg-green-500/5'
                                        : apt.status === 'cancelled'
                                            ? 'border-red-500/30 text-red-400 bg-red-500/5'
                                            : apt.status === 'completed'
                                                ? 'border-slate-500/30 text-slate-300 bg-slate-500/5'
                                                : apt.status === 'no-show'
                                                    ? 'border-slate-600/30 text-slate-500 bg-slate-600/5'
                                                    : 'border-yellow-500/30 text-yellow-400 bg-yellow-500/5'
                                        }`}>
                                        {apt.status === 'confirmed' && <><CheckCircle size={11} /> Confirmada</>}
                                        {apt.status === 'cancelled' && <><XCircle size={11} />    Cancelada</>}
                                        {apt.status === 'completed' && <><CheckCircle size={11} /> Completada</>}
                                        {apt.status === 'no-show' && <><XCircle size={11} />    No Asistió</>}
                                        {apt.status === 'pending' && <><AlertCircle size={11} /> Pendiente</>}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
