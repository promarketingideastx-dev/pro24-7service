'use client';

import { useState, useEffect } from 'react';
import { X, User, Phone, Mail, MapPin, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { CustomerService, Customer } from '@/services/customer.service';
import { useTranslations } from 'next-intl';

interface CustomerFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (customer?: Customer, shouldBook?: boolean) => void;
    businessId: string;
    customerToEdit?: Customer | null;
}

export default function CustomerFormModal({ isOpen, onClose, onSave, businessId, customerToEdit }: CustomerFormModalProps) {
    const t = useTranslations('clients.form');
    const [loading, setLoading] = useState(false);
    const [actionType, setActionType] = useState<'save' | 'saveAndBook'>('save');
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
                await CustomerService.updateCustomer(businessId, customerToEdit.id, { ...formData, businessId });
                toast.success(t('updated'));
                onSave({ id: customerToEdit.id, ...formData, businessId }, actionType === 'saveAndBook');
            } else {
                const newCustomer = await CustomerService.createCustomer({ ...formData, businessId, tags: [] });
                toast.success(t('created'));
                onSave(newCustomer, actionType === 'saveAndBook');
            }
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
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4 sm:p-6 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-md rounded-3xl shadow-[0_4px_14px_rgba(0,0,0,0.15)] overflow-hidden flex flex-col max-h-[90dvh] animate-in zoom-in-95 duration-200">

                {/* Header Clean Light */}
                <div className="flex-none flex items-center justify-between p-5 pt-12 bg-slate-50 border-b border-slate-100">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        {customerToEdit ? t('editTitle') : t('newTitle')}
                    </h2>
                    <button type="button" onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-800 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="flex-1 p-6 space-y-4 overflow-y-auto">

                    {/* Name */}
                    <div className="space-y-1 mb-2">
                        <label className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-2 ml-1 flex items-center gap-1.5">
                            <User className="w-4 h-4 text-[#14B8A6]" /> {t('fullName')} <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            name="fullName"
                            value={formData.fullName}
                            onChange={handleChange}
                            placeholder={t('fullNamePlaceholder')}
                            className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-[#14B8A6] focus:shadow-[0_0_0_4px_rgba(20,184,166,0.1)] transition-all"
                            autoFocus
                        />
                    </div>

                    {/* Phone & Email */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-2">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-2 ml-1 flex items-center gap-1.5">
                                <Phone className="w-4 h-4 text-[#14B8A6]" /> {t('phone')}
                            </label>
                            <input
                                type="tel"
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                placeholder="+504 9999-9999"
                                className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-[#14B8A6] focus:shadow-[0_0_0_4px_rgba(20,184,166,0.1)] transition-all"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-2 ml-1 flex items-center gap-1.5">
                                <Mail className="w-4 h-4 text-[#14B8A6]" /> {t('email')}
                            </label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder={t('emailPlaceholder')}
                                className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-[#14B8A6] focus:shadow-[0_0_0_4px_rgba(20,184,166,0.1)] transition-all"
                            />
                        </div>
                    </div>

                    {/* Address */}
                    <div className="space-y-1 mb-2">
                        <label className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-2 ml-1 flex items-center gap-1.5">
                            <MapPin className="w-4 h-4 text-[#14B8A6]" /> {t('address')}
                        </label>
                        <input
                            type="text"
                            name="address"
                            value={formData.address}
                            onChange={handleChange}
                            placeholder={t('addressPlaceholder')}
                            className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-[#14B8A6] focus:shadow-[0_0_0_4px_rgba(20,184,166,0.1)] transition-all"
                        />
                    </div>

                    {/* Notes */}
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-2 ml-1 flex items-center gap-1.5">
                            <FileText className="w-4 h-4 text-[#14B8A6]" /> {t('notes')}
                        </label>
                        <textarea
                            name="notes"
                            value={formData.notes}
                            onChange={handleChange}
                            rows={3}
                            placeholder={t('notesPlaceholder')}
                            className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-[#14B8A6] focus:shadow-[0_0_0_4px_rgba(20,184,166,0.1)] transition-all resize-none"
                        />
                    </div>

                    {/* Footer Clean Light */}
                    <div className="pt-2 pb-6 flex items-center justify-end gap-3 mt-4 flex-wrap sm:flex-nowrap">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-3.5 text-sm font-bold text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors sm:w-auto w-full order-last sm:order-first"
                        >
                            {t('cancel')}
                        </button>
                        <div className="flex-1 flex gap-2 w-full sm:w-auto">
                            <button
                                type="submit"
                                onClick={() => setActionType('save')}
                                disabled={loading}
                                className={`flex-1 py-3.5 text-sm font-bold rounded-xl shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center ${customerToEdit ? 'bg-[#14B8A6] hover:bg-[#0F9488] text-white shadow-[#14B8A6]/20' : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200'}`}
                            >
                                {loading && actionType === 'save' ? (
                                    <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <span>{customerToEdit ? t('saveChanges') : t('createClient')}</span>
                                )}
                            </button>
                            
                            {!customerToEdit && (
                                <button
                                    type="submit"
                                    onClick={() => setActionType('saveAndBook')}
                                    disabled={loading}
                                    className="flex-[1.5] py-3.5 bg-[#14B8A6] hover:bg-[#0F9488] text-white font-bold rounded-xl text-sm shadow-[0_4px_14px_rgba(20,184,166,0.30)] flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading && actionType === 'saveAndBook' ? (
                                        <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <span>Guardar y Agendar Cita</span>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
