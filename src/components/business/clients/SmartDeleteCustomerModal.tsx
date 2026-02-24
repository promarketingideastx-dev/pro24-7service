'use client';

import { useState, useEffect } from 'react';
import { X, AlertTriangle, Trash2, Loader2, Archive } from 'lucide-react';
import { Customer, CustomerService } from '@/services/customer.service';
import { Appointment, AppointmentService } from '@/services/appointment.service';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

interface SmartDeleteCustomerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    customer: Customer | null;
    businessId: string;
}

export default function SmartDeleteCustomerModal({
    isOpen, onClose, onSuccess, customer, businessId
}: SmartDeleteCustomerModalProps) {
    const t = useTranslations('clients.deleteModal');
    const [step, setStep] = useState<'checking' | 'confirm' | 'deleting'>('checking');
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [action, setAction] = useState<'archive' | 'client_only' | 'all' | 'appointments_only' | null>(null);

    useEffect(() => {
        if (isOpen && customer && businessId) {
            checkData();
        } else {
            setStep('checking');
            setAppointments([]);
            setAction(null);
        }
    }, [isOpen, customer, businessId]);

    const checkData = async () => {
        if (!customer?.id) return;
        setStep('checking');
        try {
            const apts = await AppointmentService.getAppointmentsByCustomer(businessId, customer.id);
            setAppointments(apts);
            setStep('confirm');
        } catch (error) {
            console.error(error);
            toast.error(t('checkError'));
            onClose();
        }
    };

    const handleDelete = async (deleteAction: 'archive' | 'appointments_only' | 'all' | 'client_only') => {
        if (!customer?.id) return;
        setAction(deleteAction as any);
        setStep('deleting');
        try {
            if (deleteAction === 'archive') {
                await CustomerService.archiveCustomer(customer.id);
                toast.success(t('archivedSuccess'));
            } else {
                if (deleteAction === 'all' || deleteAction === 'appointments_only') {
                    const deletePromises = appointments.map(apt => AppointmentService.deleteAppointment(apt.id!));
                    await Promise.all(deletePromises);
                }
                if (deleteAction === 'all' || deleteAction === 'client_only') {
                    await CustomerService.deleteCustomer(customer.id);
                }
                const message =
                    deleteAction === 'all' ? t('deletedAll') :
                        deleteAction === 'appointments_only' ? t('deletedAppts') :
                            t('deletedClient');
                toast.success(message);
            }
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error deleting:', error);
            toast.error(t('deleteError'));
            setStep('confirm');
        }
    };

    if (!isOpen || !customer) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white border border-slate-200 w-full max-w-md rounded-2xl p-6 shadow-2xl relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-slate-800">
                    <X size={20} />
                </button>

                <div className="flex flex-col items-center text-center mb-6">
                    <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4 text-red-500">
                        {step === 'checking' || step === 'deleting' ? (
                            <Loader2 className="animate-spin" size={32} />
                        ) : (
                            <Trash2 size={32} />
                        )}
                    </div>

                    <h2 className="text-xl font-bold text-white mb-2">
                        {step === 'checking' ? t('checking') :
                            step === 'deleting' ? t('deleting') :
                                t('deleteTitle', { name: customer.fullName })}
                    </h2>

                    {step === 'confirm' && (
                        <p className="text-slate-400 text-sm">{t('selectAction')}</p>
                    )}
                </div>

                {step === 'confirm' && (
                    <div className="space-y-4">
                        {appointments.length > 0 ? (
                            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-left">
                                <h4 className="flex items-center gap-2 text-amber-500 font-bold text-sm mb-2">
                                    <AlertTriangle size={16} />
                                    {t('hasAppointments', { count: appointments.length })}
                                </h4>

                                <div className="space-y-2">
                                    <button
                                        onClick={() => handleDelete('archive')}
                                        className="w-full p-3 bg-brand-neon-cyan/10 hover:bg-brand-neon-cyan/20 border border-brand-neon-cyan/30 rounded-lg text-left transition-colors group"
                                    >
                                        <span className="flex items-center gap-2 text-brand-neon-cyan font-medium text-sm">
                                            <Archive size={14} /> {t('archiveLabel')}
                                        </span>
                                        <span className="block text-slate-500 text-xs mt-0.5 pl-5">
                                            {t('archiveDesc')}
                                        </span>
                                    </button>

                                    <button
                                        onClick={() => handleDelete('appointments_only')}
                                        className="w-full p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-left transition-colors group"
                                    >
                                        <span className="block text-white font-medium text-sm">{t('deleteAppts')}</span>
                                        <span className="block text-slate-500 text-xs mt-0.5">{t('deleteApptDesc')}</span>
                                    </button>

                                    <button
                                        onClick={() => handleDelete('all')}
                                        className="w-full p-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg text-left transition-colors"
                                    >
                                        <span className="block text-red-400 font-medium text-sm">{t('deleteAll')}</span>
                                        <span className="block text-red-500/60 text-xs mt-0.5">{t('deleteAllDesc')}</span>
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <p className="text-slate-400 text-sm text-center">
                                    {t('noAppointments')}
                                </p>
                                <button
                                    onClick={() => handleDelete('client_only')}
                                    className="w-full py-3 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20"
                                >
                                    {t('confirmDelete')}
                                </button>
                            </div>
                        )}

                        <button
                            onClick={onClose}
                            className="w-full py-2.5 text-slate-400 hover:text-slate-800 transition-colors text-sm font-medium"
                        >
                            {t('cancel')}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
