'use client';

import { useState, useEffect } from 'react';
import { X, User, Phone, Mail, MapPin, Tag, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { CustomerService, Customer } from '@/services/customer.service';

interface CustomerFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void; // Callback to refresh list
    businessId: string;
    customerToEdit?: Customer | null;
}

export default function CustomerFormModal({ isOpen, onClose, onSave, businessId, customerToEdit }: CustomerFormModalProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        fullName: '',
        phone: '',
        email: '',
        address: '',
        notes: ''
    });

    useEffect(() => {
        if (isOpen) {
            if (customerToEdit) {
                setFormData({
                    fullName: customerToEdit.fullName || '',
                    phone: customerToEdit.phone || '',
                    email: customerToEdit.email || '',
                    address: customerToEdit.address || '',
                    notes: customerToEdit.notes || ''
                });
            } else {
                setFormData({
                    fullName: '',
                    phone: '',
                    email: '',
                    address: '',
                    notes: ''
                });
            }
        }
    }, [isOpen, customerToEdit]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.fullName.trim()) {
            toast.error("El nombre completo es obligatorio");
            return;
        }

        setLoading(true);
        try {
            if (customerToEdit && customerToEdit.id) {
                await CustomerService.updateCustomer(customerToEdit.id, {
                    ...formData,
                    businessId // Ensure businessId is kept/checked
                });
                toast.success("Cliente actualizado correctamente");
            } else {
                await CustomerService.createCustomer({
                    ...formData,
                    businessId,
                    tags: [] // Initialize empty tags
                });
                toast.success("Cliente creado correctamente");
            }
            onSave();
            onClose();
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Error al guardar cliente");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-[#1e5555] w-full max-w-md rounded-2xl border border-white/10 shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/5 bg-white/5">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        {customerToEdit ? 'Editar Cliente' : 'Nuevo Cliente'}
                    </h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">

                    {/* Name */}
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-400 flex items-center gap-1">
                            <User className="w-3 h-3" /> Nombre Completo <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            name="fullName"
                            value={formData.fullName}
                            onChange={handleChange}
                            placeholder="Ej. Juan Pérez"
                            className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2.5 text-white placeholder:text-slate-600 focus:outline-none focus:border-brand-neon-cyan/50 focus:ring-1 focus:ring-brand-neon-cyan/50 transition-all"
                            autoFocus
                        />
                    </div>

                    {/* Phone & Email */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-400 flex items-center gap-1">
                                <Phone className="w-3 h-3" /> Teléfono
                            </label>
                            <input
                                type="tel"
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                placeholder="+504 9999-9999"
                                className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2.5 text-white placeholder:text-slate-600 focus:outline-none focus:border-brand-neon-cyan/50 focus:ring-1 focus:ring-brand-neon-cyan/50 transition-all"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-400 flex items-center gap-1">
                                <Mail className="w-3 h-3" /> Email
                            </label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="cliente@email.com"
                                className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2.5 text-white placeholder:text-slate-600 focus:outline-none focus:border-brand-neon-cyan/50 focus:ring-1 focus:ring-brand-neon-cyan/50 transition-all"
                            />
                        </div>
                    </div>

                    {/* Address */}
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-400 flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> Dirección
                        </label>
                        <input
                            type="text"
                            name="address"
                            value={formData.address}
                            onChange={handleChange}
                            placeholder="Ej. Col. Las Lomas, Bloque B..."
                            className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2.5 text-white placeholder:text-slate-600 focus:outline-none focus:border-brand-neon-cyan/50 focus:ring-1 focus:ring-brand-neon-cyan/50 transition-all"
                        />
                    </div>

                    {/* Notes */}
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-400 flex items-center gap-1">
                            <FileText className="w-3 h-3" /> Notas
                        </label>
                        <textarea
                            name="notes"
                            value={formData.notes}
                            onChange={handleChange}
                            rows={3}
                            placeholder="Preferencias, alergias, o detalles importantes..."
                            className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2.5 text-white placeholder:text-slate-600 focus:outline-none focus:border-brand-neon-cyan/50 focus:ring-1 focus:ring-brand-neon-cyan/50 transition-all resize-none"
                        />
                    </div>

                    {/* Footer Actions */}
                    <div className="pt-4 flex items-center gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 font-medium text-sm transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 py-2.5 rounded-lg bg-brand-neon-cyan text-black font-bold text-sm shadow-lg shadow-cyan-500/20 hover:bg-cyan-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin"></span>
                            ) : (
                                <span>{customerToEdit ? 'Guardar Cambios' : 'Crear Cliente'}</span>
                            )}
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
}
