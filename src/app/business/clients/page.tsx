'use client';

import { useState, useEffect } from 'react';
import { Plus, Users } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { CustomerService, Customer } from '@/services/customer.service';
import CustomerList from '@/components/business/clients/CustomerList';

import CustomerFormModal from '@/components/business/clients/CustomerFormModal';
import SmartDeleteCustomerModal from '@/components/business/clients/SmartDeleteCustomerModal';
import { toast } from 'sonner';

export default function ClientsPage() {
    const { user } = useAuth();
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);

    const fetchCustomers = async () => {
        if (!user) return;
        try {
            setLoading(true);
            const data = await CustomerService.getCustomers(user.uid);
            setCustomers(data);
        } catch (error) {
            console.error(error);
            toast.error("Error al cargar clientes");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCustomers();
    }, [user]);

    const handleCreate = () => {
        setSelectedCustomer(null);
        setIsFormOpen(true);
    };

    const handleEdit = (customer: Customer) => {
        setSelectedCustomer(customer);
        setIsFormOpen(true);
    };

    const handleSave = () => {
        fetchCustomers();
    };

    const handleDelete = (customer: Customer) => {
        setCustomerToDelete(customer);
        setIsDeleteModalOpen(true);
    };

    const handleDeleteSuccess = () => {
        fetchCustomers();
        // Toast is handled in the modal
    };

    if (!user) return null;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Users className="text-brand-neon-cyan" />
                        Gestión de Clientes
                    </h1>
                    <p className="text-slate-400 text-sm mt-1">
                        Administra tu base de datos de clientes y su historial.
                    </p>
                </div>
                <button
                    onClick={handleCreate}
                    className="px-4 py-2.5 bg-brand-neon-cyan hover:bg-cyan-400 text-black font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 transition-all active:scale-95"
                >
                    <Plus className="w-5 h-5" />
                    <span>Nuevo Cliente</span>
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
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                />
            )}

            {/* Modal */}
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
