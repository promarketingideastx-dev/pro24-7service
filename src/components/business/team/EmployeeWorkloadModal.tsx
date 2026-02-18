import { Appointment } from '@/services/appointment.service';
import { EmployeeData } from '@/services/employee.service';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { X, Calendar, User, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import GlassPanel from '@/components/ui/GlassPanel';

interface EmployeeWorkloadModalProps {
    isOpen: boolean;
    onClose: () => void;
    employee: EmployeeData | null;
    appointments: Appointment[];
    loading: boolean;
}

export default function EmployeeWorkloadModal({ isOpen, onClose, employee, appointments, loading }: EmployeeWorkloadModalProps) {
    if (!isOpen || !employee) return null;

    // Filter out past appointments or group them? 
    // Let's grouping by Upcoming vs Past
    const now = new Date();
    const upcoming = appointments.filter(a => a.date.toDate() >= now);
    const past = appointments.filter(a => a.date.toDate() < now);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#151b2e] border border-white/10 w-full max-w-2xl rounded-2xl p-6 shadow-2xl relative max-h-[90vh] flex flex-col">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-slate-500 hover:text-white"
                >
                    <X size={20} />
                </button>

                <div className="flex items-center gap-4 mb-6 shrink-0">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-lg">
                        {employee.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white">Agenda de {employee.name}</h2>
                        <p className="text-slate-400 text-sm">{employee.role} • {appointments.length} Citas Totales</p>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6 pr-2">
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-neon-cyan"></div>
                        </div>
                    ) : appointments.length === 0 ? (
                        <div className="text-center py-12 text-slate-500">
                            <Calendar size={40} className="mx-auto mb-3 opacity-20" />
                            <p>No hay citas asignadas a este miembro.</p>
                        </div>
                    ) : (
                        <>
                            {/* Upcoming */}
                            <div>
                                <h3 className="text-brand-neon-cyan font-bold text-sm uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <Clock size={14} /> Próximas Citas ({upcoming.length})
                                </h3>
                                {upcoming.length > 0 ? (
                                    <div className="space-y-2">
                                        {upcoming.map(apt => (
                                            <AppointmentCard key={apt.id} appointment={apt} />
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-slate-600 text-sm italic">No hay citas próximas.</p>
                                )}
                            </div>

                            {/* Past */}
                            <div>
                                <h3 className="text-slate-500 font-bold text-sm uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <CheckCircle size={14} /> Historial Reciente ({past.length})
                                </h3>
                                {past.length > 0 ? (
                                    <div className="space-y-2 opacity-70 hover:opacity-100 transition-opacity">
                                        {past.map(apt => (
                                            <AppointmentCard key={apt.id} appointment={apt} />
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-slate-600 text-sm italic">No hay historial.</p>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

function AppointmentCard({ appointment }: { appointment: Appointment }) {
    const statusColors = {
        confirmed: 'bg-green-500/10 border-green-500/20 text-green-400',
        pending: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400',
        cancelled: 'bg-red-500/10 border-red-500/20 text-red-400',
        completed: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
        'no-show': 'bg-slate-500/10 border-slate-500/20 text-slate-400',
    };

    const statusLabels = {
        confirmed: 'Confirmada',
        pending: 'Pendiente',
        cancelled: 'Cancelada',
        completed: 'Completada',
        'no-show': 'No Asistió',
    };

    return (
        <div className="bg-white/5 border border-white/5 rounded-xl p-3 flex justify-between items-center hover:bg-white/10 transition-colors">
            <div className="flex items-center gap-4">
                <div className="flex flex-col items-center justify-center w-12 h-12 bg-black/20 rounded-lg border border-white/5 text-slate-300">
                    <span className="text-xs font-bold uppercase">{format(appointment.date.toDate(), 'MMM', { locale: es })}</span>
                    <span className="text-lg font-bold">{format(appointment.date.toDate(), 'd')}</span>
                </div>
                <div>
                    <h4 className="font-bold text-white text-sm">{appointment.customerName}</h4>
                    <p className="text-slate-400 text-xs flex items-center gap-2">
                        <span>{appointment.serviceName}</span>
                        <span>•</span>
                        <Clock size={10} />
                        <span>{format(appointment.date.toDate(), 'h:mm a')}</span>
                    </p>
                    {appointment.customerPhone && (
                        <p className="text-slate-500 text-[10px] mt-0.5">{appointment.customerPhone}</p>
                    )}
                </div>
            </div>
            <div className={`px-2 py-1 rounded text-xs font-bold border ${statusColors[appointment.status]}`}>
                {statusLabels[appointment.status]}
            </div>
        </div>
    );
}
