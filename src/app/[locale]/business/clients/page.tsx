'use client';

import { useState, useEffect } from 'react';
import { Plus, Users } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { CustomerService, Customer } from '@/services/customer.service';
import { BookingService } from '@/services/booking.service';
import { BookingDocument } from '@/types/firestore-schema';
import { BusinessProfileService } from '@/services/businessProfile.service';
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

function computeStats(bookings: BookingDocument[], customers: Customer[]): Record<string, CustomerStats> {
    const stats: Record<string, CustomerStats> = {};
    const now = new Date();

    for (const b of bookings) {
        // Enlazar la reserva con el cliente del CRM si existen coincidencias
        let matchedCustomer = null;
        if (b.clientEmail || b.clientPhone) {
             matchedCustomer = customers.find(c => 
                 (b.clientEmail && c.email === b.clientEmail) || 
                 (b.clientPhone && c.phone === b.clientPhone)
             );
        }
        
        const key = matchedCustomer?.id || b.clientId; 
        if (!key) continue;

        if (!stats[key]) {
            stats[key] = { ltv: 0, lastVisit: null, nextAppointment: null, appointmentCount: 0 };
        }

        const [y, m, d] = b.date.split('-').map(Number);
        const [hr, mn] = b.time.split(':').map(Number);
        const aptDate = new Date(y, m - 1, d, hr, mn);
        
        const s = stats[key];
        s.appointmentCount++;

        // LTV: suma de amount de citas confirmadas/completadas
        if ((b.status === 'confirmed' || b.status === 'completed') && b.totalAmount) {
            s.ltv += b.totalAmount;
        }

        // Última visita
        if (aptDate < now && (b.status === 'confirmed' || b.status === 'completed')) {
            if (!s.lastVisit || aptDate > s.lastVisit) s.lastVisit = aptDate;
        }

        // Siguiente cita
        if (aptDate >= now && b.status === 'confirmed') {
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
    const [businessCountry, setBusinessCountry] = useState<string>('HN');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);

    const fetchData = async () => {
        if (!user) return;
        try {
            setLoading(true);
            const [initialCustomerData, allBookings, profile] = await Promise.all([
                CustomerService.getCustomers(user.uid),
                BookingService.getByBusiness(user.uid),
                BusinessProfileService.getProfile(user.uid),
            ]);
            
            let finalCustomerData = [...initialCustomerData];
            
            // FASE 4: Auto-sync en memoria (Resolución Temporal para Evitar Índices Compuestos)
            // Se inyectan las huellas de clientes desde bookings directamente a la vista del CRM.
            for (const b of allBookings) {
                if (b.clientEmail || b.clientPhone) {
                    const exists = finalCustomerData.some((c: Customer) => 
                        (b.clientEmail && c.email === b.clientEmail) || 
                        (b.clientPhone && c.phone === b.clientPhone)
                    );
                    if (!exists) {
                        // Create a volatile Customer instance for the CRM view
                        finalCustomerData.push({
                            id: b.clientId || `temp-${b.id}`,
                            businessId: user.uid,
                            fullName: b.clientName || 'Cliente Online',
                            email: b.clientEmail || '',
                            phone: b.clientPhone || '',
                            notes: 'Autogenerado vía Cita (Temporal en memoria)',
                            createdAt: b.createdAt || new Date().toISOString(),
                            updatedAt: new Date().toISOString(),
                        } as Customer);
                    }
                }
            }

            const visibleCustomers = finalCustomerData.filter(c => !c.archived);

            setCustomers(visibleCustomers);
            setAppointmentStats(computeStats(allBookings, visibleCustomers));
            if (profile?.country) setBusinessCountry(profile.country);
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
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <Users className="text-[#14B8A6]" />
                        {t('title')}
                    </h1>
                    <p className="text-slate-400 text-sm mt-1">
                        {t('subtitle')}
                    </p>
                </div>
                <button
                    onClick={handleCreate}
                    className="px-4 py-2.5 bg-[#14B8A6] hover:bg-[#0F9488] text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-[0_4px_12px_rgba(20,184,166,0.30)] transition-all active:scale-95"
                >
                    <Plus className="w-5 h-5" />
                    <span>{t('addNew')}</span>
                </button>
            </div>

            {/* Content */}
            {loading ? (
                <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-20 bg-white rounded-xl animate-pulse"></div>
                    ))}
                </div>
            ) : (
                <CustomerList
                    customers={customers}
                    appointmentStats={appointmentStats}
                    businessCountry={businessCountry}
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
