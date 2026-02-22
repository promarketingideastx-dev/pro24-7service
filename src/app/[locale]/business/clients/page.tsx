'use client';

import { useState, useEffect } from 'react';
import { Plus, Users } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { CustomerService, Customer } from '@/services/customer.service';
import { AppointmentService, Appointment } from '@/services/appointment.service';
import CustomerList from '@/components/business/clients/CustomerList';
import CustomerFormModal from '@/components/business/clients/CustomerFormModal';
import SmartDeleteCustomerModal from '@/components/business/clients/SmartDeleteCustomerModal';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

export interface CustomerStats {
    ltv: number;
    lastVisit: Date | null;
    nextAppointment: Date | null;
    appointmentCount: number;
}

function computeStats(appointments: Appointment[]): Record<string, CustomerStats> {
    const stats: Record<string, CustomerStats> = {};
    const now = new Date();

    for (const apt of appointments) {
        const key = apt.customerId || `phone:${apt.customerPhone}` || `name:${apt.customerName}`;
        if (!key) continue;

        if (!stats[key]) {
            stats[key] = { ltv: 0, lastVisit: null, nextAppointment: null, appointmentCount: 0 };
        }

        const aptDate = apt.date.toDate();
        const s = stats[key];
        s.appointmentCount++;

        // LTV: sum of accepted/completed appointments
        if ((apt.status === 'confirmed' || apt.status === 'completed') && apt.servicePrice) {
            s.ltv += apt.servicePrice;
        }

        // Last visit: most recent past confirmed/completed
        if (aptDate < now && (apt.status === 'confirmed' || apt.status === 'completed')) {
            if (!s.lastVisit || aptDate > s.lastVisit) s.lastVisit = aptDate;
        }

        // Next appointment: soonest future confirmed
        if (aptDate >= now && apt.status === 'confirmed') {
            if (!s.nextAppointment || aptDate < s.nextAppointment) s.nextAppointment = aptDate;
        }
    }

    return stats;
}

export default function ClientsPage() {
    const { user } = useAuth();
    const t = useTranslations('business.clients');
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [appointmentStats, setAppointmentStats] = useState<Record<string, CustomerStats>>({});
    const [loading, setLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);

    const fetchData = async () => {
        if (!user) return;
        try {
            setLoading(true);
            // Fetch customers and all appointments in parallel
            const [customerData, allAppointments] = await Promise.all([
                CustomerService.getCustomers(user.uid),
                AppointmentService.getAllByBusiness(user.uid),
            ]);
            setCustomers(customerData);
            setAppointmentStats(computeStats(allAppointments));
        } catch (error) {
            console.error(error);
            toast.error("Error al cargar clientes");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [user]);

    const handleCreate = () => { setSelectedCustomer(null); setIsFormOpen(true); };
    const handleEdit = (customer: Customer) => { setSelectedCustomer(customer); setIsFormOpen(true); };
    const handleSave = () => { fetchData(); };
    const handleDelete = (customer: Customer) => { setCustomerToDelete(customer); setIsDeleteModalOpen(true); };
    const handleDeleteSuccess = () => { fetchData(); };

    if (!user) return null;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Users className="text-brand-neon-cyan" />
                        {t('title')}
                    </h1>
                    <p className="text-slate-400 text-sm mt-1">
                        {t('subtitle')}
                    </p>
                </div>
                <button
                    onClick={handleCreate}
                    className="px-4 py-2.5 bg-brand-neon-cyan hover:bg-cyan-400 text-black font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 transition-all active:scale-95"
                >
                    <Plus className="w-5 h-5" />
                    <span>{t('addNew')}</span>
                </button>
            </div>

            {/* Content */}
            {loading ? (
                <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-20 bg-[#151b2e] rounded-xl animate-pulse"></div>
                    ))}
                </div>
            ) : (
                <CustomerList
                    customers={customers}
                    appointmentStats={appointmentStats}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                />
            )}

            <CustomerFormModal
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                onSave={handleSave}
                businessId={user.uid}
                customerToEdit={selectedCustomer}
            />

            <SmartDeleteCustomerModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onSuccess={handleDeleteSuccess}
                customer={customerToDelete}
                businessId={user.uid}
            />
        </div>
    );
}
