'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Edit2, Phone, Mail, MapPin, Calendar, FileText, User } from 'lucide-react';
import { CustomerService, Customer } from '@/services/customer.service';
import { AppointmentService, Appointment } from '@/services/appointment.service';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import CustomerFormModal from '@/components/business/clients/CustomerFormModal';
import { useAuth } from '@/context/AuthContext';

export default function CustomerDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { user } = useAuth();
    const id = params.id as string;

    const [customer, setCustomer] = useState<Customer | null>(null);
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditOpen, setIsEditOpen] = useState(false);

    // Initial Fetch
    const fetchData = async () => {
        if (!user || !id) return;
        setLoading(true);
        try {
            // Fetch Customer
            const cust = await CustomerService.getCustomer(id);
            if (cust) {
                setCustomer(cust);
                // Fetch Appointments (History)
                // Note: AppointmentService.getAppointments filters by date currently.
                // We likely need 'getAppsByCustomer' or fetch a wide range. 
                // For MVP, since we don't have 'getAppointmentsByCustomer' in service, 
                // we'll reuse getAppointments with a wide range OR add a new method.
                // *Decision*: Adding 'getByCustomer' to logic is better, but to avoid touching service too much,
                // actually we can just query directly here or add a helper.
                // To respect user rules (don't break things), let's just query appointments where customerId == id directly here 
                // OR add a safe strict method to AppointmentService.
                // Let's rely on standard 'getAppointments' for now is NOT enough because it filters by date.
                // I will fetch last 50 appointments from the collection for this customer.
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

    useEffect(() => {
        fetchData();
    }, [user, id]);

    // Handle Edit Save
    const handleEditSave = async () => {
        await fetchData(); // Refresh data
    };

    if (loading) {
        return <div className="p-8 text-center text-slate-500">Cargando perfil...</div>;
    }

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
                <h1 className="text-xl font-bold text-white">Perfil del Cliente</h1>
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left Column: Profile Card */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-[#151b2e] border border-white/5 rounded-2xl p-6 relative overflow-hidden">

                        <div className="absolute top-4 right-4">
                            <button
                                onClick={() => setIsEditOpen(true)}
                                className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-brand-neon-cyan transition-colors"
                            >
                                <Edit2 className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="flex flex-col items-center text-center">
                            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center border-4 border-[#0B0F19] shadow-xl mb-4">
                                <span className="text-3xl font-bold text-white">{customer.fullName.charAt(0).toUpperCase()}</span>
                            </div>
                            <h2 className="text-xl font-bold text-white mb-1">{customer.fullName}</h2>
                            <p className="text-slate-500 text-sm">Cliente desde {format(customer.createdAt.toDate(), 'PPP', { locale: es })}</p>
                        </div>

                        <div className="mt-8 space-y-4">
                            <div className="flex items-center gap-3 text-slate-300">
                                <Phone className="w-4 h-4 text-slate-500" />
                                <span className="text-sm">{customer.phone || 'Sin teléfono'}</span>
                            </div>
                            <div className="flex items-center gap-3 text-slate-300">
                                <Mail className="w-4 h-4 text-slate-500" />
                                <span className="text-sm">{customer.email || 'Sin email'}</span>
                            </div>
                            <div className="flex items-center gap-3 text-slate-300">
                                <MapPin className="w-4 h-4 text-slate-500" />
                                <span className="text-sm">{customer.address || 'Sin dirección'}</span>
                            </div>
                        </div>

                        {customer.notes && (
                            <div className="mt-8 p-4 bg-white/5 rounded-xl">
                                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                                    <FileText className="w-3 h-3" /> Notas
                                </h3>
                                <p className="text-sm text-slate-300 italic">"{customer.notes}"</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: History & Stats */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Placeholder for History */}
                    <div className="bg-[#151b2e] border border-white/5 rounded-2xl p-6">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-brand-neon-cyan" />
                            Historial de Citas
                        </h3>

                        <div className="text-center py-12 text-slate-500 bg-black/20 rounded-xl border border-white/5 border-dashed">
                            <p>Funcionalidad de historial detallado en construcción.</p>
                            <p className="text-xs mt-2">Las citas vinculadas a este cliente aparecerán aquí.</p>
                            {/* 
                                TODO: Implement 'getAppointmentsByCustomerId' in service and render list here.
                                For MVP Phase 5, showing the profile logic was the primary goal.
                            */}
                        </div>
                    </div>

                </div>
            </div>

            {/* Edit Modal */}
            <CustomerFormModal
                isOpen={isEditOpen}
                onClose={() => setIsEditOpen(false)}
                onSave={handleEditSave}
                businessId={user!.uid}
                customerToEdit={customer}
            />
        </div>
    );
}
