'use client';

import { useState, useEffect } from 'react';
import { X, User, Phone, Mail, MapPin, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { CustomerService, Customer } from '@/services/customer.service';
import { useTranslations } from 'next-intl';

interface CustomerFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    businessId: string;
    customerToEdit?: Customer | null;
}

export default function CustomerFormModal({ isOpen, onClose, onSave, businessId, customerToEdit }: CustomerFormModalProps) {
    const t = useTranslations('clients.form');
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
                setFormData({ fullName: '', phone: '', email: '', address: '', notes: '' });
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
            toast.error(t('nameRequired'));
            return;
        }
        setLoading(true);
        try {
            if (customerToEdit && customerToEdit.id) {
                await CustomerService.updateCustomer(customerToEdit.id, { ...formData, businessId });
                toast.success(t('updated'));
            } else {
                await CustomerService.createCustomer({ ...formData, businessId, tags: [] });
                toast.success(t('created'));
            }
            onSave();
            onClose();
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || t('saveError'));
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-md rounded-2xl border border-slate-200 shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
                    <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        {customerToEdit ? t('editTitle') : t('newTitle')}
                    </h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-800 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">

                    {/* Name */}
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-400 flex items-center gap-1">
                            <User className="w-3 h-3" /> {t('fullName')} <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            name="fullName"
                            value={formData.fullName}
                            onChange={handleChange}
                            placeholder={t('fullNamePlaceholder')}
                            className="w-full bg-white border border-[#E6E8EC] rounded-lg px-3 py-2.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#14B8A6] focus:ring-1 focus:ring-[#14B8A6]/20 transition-all"
                            autoFocus
                        />
                    </div>

                    {/* Phone & Email */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                                <Phone className="w-3 h-3" /> {t('phone')}
                            </label>
                            <input
                                type="tel"
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                placeholder="+504 9999-9999"
                                className="w-full bg-white border border-[#E6E8EC] rounded-lg px-3 py-2.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#14B8A6] focus:ring-1 focus:ring-[#14B8A6]/20 transition-all"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                                <Mail className="w-3 h-3" /> {t('email')}
                            </label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder={t('emailPlaceholder')}
                                className="w-full bg-white border border-[#E6E8EC] rounded-lg px-3 py-2.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#14B8A6] focus:ring-1 focus:ring-[#14B8A6]/20 transition-all"
                            />
                        </div>
                    </div>

                    {/* Address */}
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {t('address')}
                        </label>
                        <input
                            type="text"
                            name="address"
                            value={formData.address}
                            onChange={handleChange}
                            placeholder={t('addressPlaceholder')}
                            className="w-full bg-white border border-[#E6E8EC] rounded-lg px-3 py-2.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#14B8A6] focus:ring-1 focus:ring-[#14B8A6]/20 transition-all"
                        />
                    </div>

                    {/* Notes */}
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                            <FileText className="w-3 h-3" /> {t('notes')}
                        </label>
                        <textarea
                            name="notes"
                            value={formData.notes}
                            onChange={handleChange}
                            rows={3}
                            placeholder={t('notesPlaceholder')}
                            className="w-full bg-white border border-[#E6E8EC] rounded-lg px-3 py-2.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#14B8A6] focus:ring-1 focus:ring-[#14B8A6]/20 transition-all resize-none"
                        />
                    </div>

                    {/* Footer */}
                    <div className="pt-4 flex items-center gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-2.5 rounded-lg bg-[#F4F6F8] hover:bg-slate-100 text-slate-600 font-medium text-sm border border-[#E6E8EC] transition-colors"
                        >
                            {t('cancel')}
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 py-2.5 rounded-lg bg-[#14B8A6] hover:bg-[#0F9488] text-white font-bold text-sm shadow-[0_4px_14px_rgba(20,184,166,0.30)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <span>{customerToEdit ? t('saveChanges') : t('createClient')}</span>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
