'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Edit2, Phone, Mail, MapPin, Calendar, FileText, Clock, TrendingUp, CheckCircle, XCircle, AlertCircle, Save } from 'lucide-react';
import { CustomerService, Customer } from '@/services/customer.service';
import { AppointmentService, Appointment } from '@/services/appointment.service';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import CustomerFormModal from '@/components/business/clients/CustomerFormModal';
import { useAuth } from '@/context/AuthContext';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    confirmed: { label: 'Confirmada', color: 'text-green-400 bg-green-500/10 border-green-500/30', icon: <CheckCircle className="w-3 h-3" /> },
    completed: { label: 'Completada', color: 'text-blue-400 bg-blue-500/10 border-blue-500/30', icon: <CheckCircle className="w-3 h-3" /> },
    pending: { label: 'Pendiente', color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30', icon: <AlertCircle className="w-3 h-3" /> },
    cancelled: { label: 'Cancelada', color: 'text-red-400 bg-red-500/10 border-red-500/30', icon: <XCircle className="w-3 h-3" /> },
    'no-show': { label: 'No Asistió', color: 'text-slate-400 bg-slate-500/10 border-slate-500/30', icon: <XCircle className="w-3 h-3" /> },
};

export default function CustomerDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { user } = useAuth();
    const id = params.id as string;

    const [customer, setCustomer] = useState<Customer | null>(null);
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditOpen, setIsEditOpen] = useState(false);

    // Inline notes state
    const [notes, setNotes] = useState('');
    const [savingNotes, setSavingNotes] = useState(false);
    const [notesDirty, setNotesDirty] = useState(false);

    const fetchData = async () => {
        if (!user || !id) return;
        setLoading(true);
        try {
            const [cust, allApts] = await Promise.all([
                CustomerService.getCustomer(id),
                AppointmentService.getAppointmentsByCustomer(user.uid, id),
            ]);

            if (cust) {
                setCustomer(cust);
                setNotes(cust.notes || '');
                // Sort by date desc
                const sorted = allApts.sort((a, b) => b.date.toDate().getTime() - a.date.toDate().getTime());
                setAppointments(sorted);
            } else {
                router.push('/business/clients');
                toast.error("Cliente no encontrado");
            }
        } catch (error) {
            console.error(error);
            toast.error("Error al cargar datos");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, [user, id]);

    const handleSaveNotes = async () => {
        if (!customer?.id) return;
        setSavingNotes(true);
        try {
            await CustomerService.updateCustomer(customer.id, { notes });
            setNotesDirty(false);
            toast.success("Notas guardadas");
        } catch {
            toast.error("Error al guardar notas");
        } finally {
            setSavingNotes(false);
        }
    };

    // Compute LTV for this customer
    const ltv = appointments
        .filter(a => a.status === 'confirmed' || a.status === 'completed')
        .reduce((sum, a) => sum + (a.servicePrice || 0), 0);

    const lastVisit = appointments
        .filter(a => (a.status === 'confirmed' || a.status === 'completed') && a.date.toDate() < new Date())
        .sort((a, b) => b.date.toDate().getTime() - a.date.toDate().getTime())[0];

    const nextAppt = appointments
        .filter(a => a.status === 'confirmed' && a.date.toDate() >= new Date())
        .sort((a, b) => a.date.toDate().getTime() - b.date.toDate().getTime())[0];

    if (loading) return <div className="p-8 text-center text-slate-500 animate-pulse">Cargando perfil...</div>;
    if (!customer) return null;

    return (
        <div className="space-y-6">
            {/* Header / Nav */}
            <div className="flex items-center gap-4">
                <button
                    onClick={() => router.back()}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                    <h1 className="text-xl font-bold text-white">Perfil del Cliente</h1>
                    <p className="text-xs text-slate-500">{customer.fullName}</p>
                </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-3">
                <div className="bg-[#1e3a5f] border border-brand-neon-cyan/20 rounded-xl p-4 text-center">
                    <TrendingUp className="w-4 h-4 text-brand-neon-cyan mx-auto mb-1" />
                    <p className="text-xl font-bold text-brand-neon-cyan">
                        {ltv > 0 ? `L ${ltv.toLocaleString()}` : '—'}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">LTV Total</p>
                </div>
                <div className="bg-[#1e3a5f] border border-white/5 rounded-xl p-4 text-center">
                    <Clock className="w-4 h-4 text-slate-500 mx-auto mb-1" />
                    <p className="text-sm font-bold text-white">
                        {lastVisit ? format(lastVisit.date.toDate(), 'd MMM', { locale: es }) : '—'}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Última Visita</p>
                </div>
                <div className="bg-[#1e3a5f] border border-white/5 rounded-xl p-4 text-center">
                    <Calendar className="w-4 h-4 text-green-400 mx-auto mb-1" />
                    <p className="text-sm font-bold text-green-400">
                        {nextAppt ? format(nextAppt.date.toDate(), 'd MMM', { locale: es }) : '—'}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Próxima Cita</p>
                </div>
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left Column: Profile Card */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-[#1e3a5f] border border-white/5 rounded-2xl p-6 relative overflow-hidden">
                        <div className="absolute top-4 right-4">
                            <button
                                onClick={() => setIsEditOpen(true)}
                                className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-brand-neon-cyan transition-colors"
                            >
                                <Edit2 className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="flex flex-col items-center text-center">
                            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-600 to-blue-700 flex items-center justify-center border-4 border-[#1a2f4e] shadow-xl mb-4">
                                <span className="text-2xl font-bold text-white">{customer.fullName.charAt(0).toUpperCase()}</span>
                            </div>
                            <h2 className="text-xl font-bold text-white mb-1">{customer.fullName}</h2>
                            {customer.createdAt && (
                                <p className="text-slate-500 text-xs">
                                    Cliente desde {format(customer.createdAt.toDate(), 'PPP', { locale: es })}
                                </p>
                            )}
                            <div className="mt-1 px-3 py-0.5 rounded-full bg-brand-neon-cyan/10 border border-brand-neon-cyan/20 text-xs text-brand-neon-cyan font-medium">
                                {appointments.length} cita{appointments.length !== 1 ? 's' : ''}
                            </div>
                        </div>

                        <div className="mt-6 space-y-3">
                            <div className="flex items-center gap-3 text-slate-300">
                                <Phone className="w-4 h-4 text-slate-500 shrink-0" />
                                <span className="text-sm">{customer.phone || 'Sin teléfono'}</span>
                            </div>
                            <div className="flex items-center gap-3 text-slate-300">
                                <Mail className="w-4 h-4 text-slate-500 shrink-0" />
                                <span className="text-sm truncate">{customer.email || 'Sin email'}</span>
                            </div>
                            {customer.address && (
                                <div className="flex items-center gap-3 text-slate-300">
                                    <MapPin className="w-4 h-4 text-slate-500 shrink-0" />
                                    <span className="text-sm">{customer.address}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Private Notes — Inline Editor */}
                    <div className="bg-[#1e3a5f] border border-white/5 rounded-2xl p-5">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <FileText className="w-3 h-3" /> Notas Privadas
                        </h3>
                        <textarea
                            value={notes}
                            onChange={(e) => { setNotes(e.target.value); setNotesDirty(true); }}
                            rows={5}
                            placeholder="Escribe notas privadas sobre este cliente..."
                            className="w-full bg-black/20 border border-white/5 rounded-xl p-3 text-sm text-slate-300 placeholder:text-slate-600 resize-none focus:outline-none focus:border-brand-neon-cyan/50 transition-colors"
                        />
                        {notesDirty && (
                            <button
                                onClick={handleSaveNotes}
                                disabled={savingNotes}
                                className="mt-2 w-full py-2 bg-brand-neon-cyan/20 hover:bg-brand-neon-cyan/30 border border-brand-neon-cyan/30 text-brand-neon-cyan rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all"
                            >
                                <Save className="w-3.5 h-3.5" />
                                {savingNotes ? 'Guardando...' : 'Guardar Notas'}
                            </button>
                        )}
                    </div>
                </div>

                {/* Right Column: Appointment History */}
                <div className="lg:col-span-2">
                    <div className="bg-[#1e3a5f] border border-white/5 rounded-2xl p-6">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-brand-neon-cyan" />
                            Historial de Citas
                            <span className="ml-auto text-xs font-normal text-slate-500">{appointments.length} registros</span>
                        </h3>

                        {appointments.length === 0 ? (
                            <div className="text-center py-12 text-slate-500 bg-black/20 rounded-xl border border-white/5 border-dashed">
                                <Calendar className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                <p>No hay citas registradas para este cliente.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {appointments.map((apt) => {
                                    const cfg = STATUS_CONFIG[apt.status] || STATUS_CONFIG['pending'];
                                    const aptDate = apt.date.toDate();
                                    return (
                                        <div
                                            key={apt.id}
                                            className="bg-white/5 border border-white/5 rounded-xl p-4 hover:bg-white/8 transition-colors"
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="font-semibold text-white text-sm">{apt.serviceName}</span>
                                                        {apt.servicePrice != null && apt.servicePrice > 0 && (
                                                            <span className="text-xs text-brand-neon-cyan font-bold">L {apt.servicePrice}</span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                                                        <span className="flex items-center gap-1">
                                                            <Calendar className="w-3 h-3" />
                                                            {format(aptDate, 'PPP', { locale: es })}
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <Clock className="w-3 h-3" />
                                                            {format(aptDate, 'p', { locale: es })}
                                                        </span>

                                                    </div>
                                                    {apt.notes && (
                                                        <p className="mt-1.5 text-xs text-slate-500 italic">"{apt.notes}"</p>
                                                    )}
                                                </div>
                                                <span className={`shrink-0 flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium border ${cfg.color}`}>
                                                    {cfg.icon}
                                                    {cfg.label}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Edit Modal */}
            <CustomerFormModal
                isOpen={isEditOpen}
                onClose={() => setIsEditOpen(false)}
                onSave={async () => { await fetchData(); }}
                businessId={user!.uid}
                customerToEdit={customer}
            />
        </div>
    );
}
