import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { X, Calendar as CalendarIcon, Clock, User, Briefcase } from 'lucide-react';
import { format } from 'date-fns';
import { ServiceData, getServiceName } from '@/services/businessProfile.service';
import { EmployeeData } from '@/services/employee.service';
import { Appointment, AppointmentStatus } from '@/services/appointment.service';
import { Customer } from '@/services/customer.service';
import { Timestamp } from 'firebase/firestore';
import { useTranslations, useLocale } from 'next-intl';

interface AppointmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (appointment: any) => Promise<void>;
    services: ServiceData[];
    employees: EmployeeData[];
    customers?: Customer[];
    initialDate?: Date;
    initialResource?: string;
    appointment?: Appointment | null;
}

export default function AppointmentModal({
    isOpen, onClose, onSave, services, employees, customers = [],
    initialDate, initialResource, appointment
}: AppointmentModalProps) {
    const t = useTranslations('agenda.modal');
    const locale = useLocale();
    const [loading, setLoading] = useState(false);
    const [customerSearch, setCustomerSearch] = useState('');
    const [showCustomerResults, setShowCustomerResults] = useState(false);

    const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm({
        defaultValues: {
            customerId: '', customerName: '', customerPhone: '',
            serviceId: '', employeeId: '', date: '', time: '',
            notes: '', status: 'confirmed' as AppointmentStatus
        }
    });

    const selectedServiceId = watch('serviceId');
    const currentCustomerId = watch('customerId');

    useEffect(() => {
        if (isOpen) {
            if (appointment) {
                const date = appointment.date.toDate();
                reset({
                    customerId: appointment.customerId || '',
                    customerName: appointment.customerName,
                    customerPhone: appointment.customerPhone || '',
                    serviceId: appointment.serviceId,
                    employeeId: appointment.employeeId === 'pending' ? '' : appointment.employeeId,
                    date: format(date, 'yyyy-MM-dd'),
                    time: format(date, 'HH:mm'),
                    notes: appointment.notes || '',
                    status: appointment.status
                });
                if (appointment.customerId && appointment.customerName) {
                    setCustomerSearch(appointment.customerName);
                }
            } else {
                reset({
                    customerId: '', customerName: '', customerPhone: '',
                    serviceId: '', employeeId: initialResource || '',
                    date: initialDate ? format(initialDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
                    time: initialDate ? format(initialDate, 'HH:mm') : '09:00',
                    notes: '', status: 'confirmed'
                });
                setCustomerSearch('');
            }
            setShowCustomerResults(false);
        }
    }, [isOpen, appointment, initialDate, initialResource, reset]);

    const handleSelectCustomer = (customer: Customer) => {
        setValue('customerId', customer.id!);
        setValue('customerName', customer.fullName);
        setValue('customerPhone', customer.phone || '');
        setCustomerSearch(customer.fullName);
        setShowCustomerResults(false);
    };

    const handleClearCustomer = () => {
        setValue('customerId', '');
        setValue('customerName', '');
        setValue('customerPhone', '');
        setCustomerSearch('');
    };

    const onSubmit = async (data: any) => {
        setLoading(true);
        try {
            const service = services.find(s => s.id === data.serviceId);
            if (!service) throw new Error('Service not found');
            const startDateTime = new Date(`${data.date}T${data.time}`);
            const appointmentData = {
                ...appointment,
                customerId: data.customerId || null,
                customerName: data.customerName,
                customerPhone: data.customerPhone,
                serviceId: data.serviceId,
                serviceName: service.name,
                serviceDuration: service.durationMinutes || 30,
                employeeId: data.employeeId,
                date: Timestamp.fromDate(startDateTime),
                status: data.status,
                notes: data.notes
            };
            await onSave(appointmentData);
            onClose();
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const filteredCustomers = customers.filter(c =>
        c.fullName.toLowerCase().includes(customerSearch.toLowerCase()) ||
        c.phone?.includes(customerSearch)
    );

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-[#151b2e] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl relative flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/10">
                    <div>
                        <h2 className="text-xl font-bold text-white">
                            {appointment ? t('editTitle') : t('newTitle')}
                        </h2>
                        <p className="text-sm text-slate-400">
                            {appointment ? t('editSubtitle') : t('newSubtitle')}
                        </p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit(onSubmit)} className="p-6 overflow-y-auto custom-scrollbar space-y-4">

                    {/* ── Customer Section ── */}
                    {appointment ? (
                        <div className="space-y-1">
                            <label className="text-xs text-slate-400 font-medium ml-1">{t('client')}</label>
                            <div className="flex items-center gap-3 bg-white/5 border border-white/8 rounded-xl px-4 py-3">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                                    {(appointment.customerName || '?').charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-white font-medium text-sm leading-tight truncate">
                                        {appointment.customerName || t('noName')}
                                    </p>
                                    {appointment.customerPhone && (
                                        <p className="text-slate-500 text-xs">{appointment.customerPhone}</p>
                                    )}
                                </div>
                                <span className="ml-auto text-[10px] text-slate-600 bg-white/5 px-2 py-0.5 rounded-full shrink-0">
                                    {t('locked')}
                                </span>
                            </div>
                            <input type="hidden" {...register('customerId')} />
                            <input type="hidden" {...register('customerName')} />
                            <input type="hidden" {...register('customerPhone')} />
                        </div>
                    ) : (
                        <div className="space-y-1 relative">
                            <label className="text-xs text-slate-400 font-medium ml-1">{t('client')} <span className="text-red-500">*</span></label>
                            <input type="hidden" {...register('customerId')} />
                            <div className="relative">
                                <User className="absolute left-3 top-2.5 text-slate-500 w-4 h-4" />
                                <input
                                    value={customerSearch}
                                    onChange={(e) => {
                                        setCustomerSearch(e.target.value);
                                        setValue('customerName', e.target.value);
                                        setValue('customerId', '');
                                        setShowCustomerResults(true);
                                    }}
                                    onFocus={() => setShowCustomerResults(true)}
                                    className="w-full bg-black/20 border border-white/10 rounded-xl py-2 pl-9 pr-10 text-sm text-white focus:outline-none focus:border-brand-neon-cyan/50 focus:ring-1 focus:ring-brand-neon-cyan/50"
                                    placeholder={t('clientPlaceholder')}
                                    autoComplete="off"
                                />
                                {currentCustomerId ? (
                                    <button type="button" onClick={handleClearCustomer}
                                        className="absolute right-3 top-2.5 text-brand-neon-cyan text-xs font-bold hover:underline">
                                        {t('linked')}
                                    </button>
                                ) : (
                                    customerSearch && (
                                        <button type="button"
                                            onClick={() => { setCustomerSearch(''); setValue('customerName', ''); setValue('customerId', ''); }}
                                            className="absolute right-3 top-2.5 text-slate-500 hover:text-white">
                                            <X className="w-4 h-4" />
                                        </button>
                                    )
                                )}
                            </div>
                            {showCustomerResults && customerSearch && filteredCustomers.length > 0 && !currentCustomerId && (
                                <div className="absolute z-10 w-full bg-[#151b2e] border border-white/10 rounded-xl shadow-xl mt-1 max-h-40 overflow-y-auto custom-scrollbar">
                                    {filteredCustomers.map(c => (
                                        <button key={c.id} type="button" onClick={() => handleSelectCustomer(c)}
                                            className="w-full text-left px-4 py-2 hover:bg-white/5 text-sm flex items-center justify-between group">
                                            <div>
                                                <p className="font-medium text-white">{c.fullName}</p>
                                                <p className="text-xs text-slate-500">{c.phone}</p>
                                            </div>
                                            <div className="opacity-0 group-hover:opacity-100 text-brand-neon-cyan text-xs">{t('select')}</div>
                                        </button>
                                    ))}
                                </div>
                            )}
                            {errors.customerName && <p className="text-red-400 text-xs ml-1">{t('clientRequired')}</p>}
                        </div>
                    )}

                    {/* Phone */}
                    {!appointment && (
                        <div className="space-y-1">
                            <label className="text-xs text-slate-400 font-medium ml-1">{t('phone')}</label>
                            <input {...register('customerPhone')}
                                className="w-full bg-black/20 border border-white/10 rounded-xl py-2 px-4 text-sm text-white focus:outline-none focus:border-brand-neon-cyan/50"
                                placeholder="+504 9999-9999" />
                        </div>
                    )}

                    {/* Service */}
                    <div className="space-y-1">
                        <label className="text-xs text-slate-400 font-medium ml-1">{t('service')} <span className="text-red-500">*</span></label>
                        <div className="relative">
                            <Briefcase className="absolute left-3 top-2.5 text-slate-500 w-4 h-4" />
                            <select
                                {...register('serviceId', { required: t('serviceRequired') })}
                                className="w-full bg-black/20 border border-white/10 rounded-xl py-2 pl-9 pr-4 text-sm text-white focus:outline-none focus:border-brand-neon-cyan/50 appearance-none"
                            >
                                <option value="">{t('selectService')}</option>
                                {services.map(s => (
                                    <option key={s.id} value={s.id}>
                                        {getServiceName(s, locale)} - ${s.price}
                                    </option>
                                ))}
                            </select>
                        </div>
                        {errors.serviceId && <p className="text-red-400 text-xs ml-1">{errors.serviceId.message as string}</p>}
                    </div>

                    {/* Team Member */}
                    <div className="space-y-2">
                        <label className="text-xs text-slate-400 font-medium ml-1">{t('assignTeam')}</label>
                        <input type="hidden" {...register('employeeId')} />
                        <div className="flex gap-2 flex-wrap">
                            <button
                                type="button"
                                onClick={() => setValue('employeeId', '')}
                                className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition-all w-16 ${!watch('employeeId')
                                    ? 'border-brand-neon-cyan bg-brand-neon-cyan/10 shadow-[0_0_10px_rgba(0,240,255,0.15)]'
                                    : 'border-white/10 bg-white/3 hover:border-white/20'
                                    }`}
                            >
                                <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-slate-400">
                                    <User className="w-5 h-5" />
                                </div>
                                <span className="text-[10px] text-slate-400 leading-tight text-center">{t('unassigned')}</span>
                            </button>

                            {employees.filter(e => e.active !== false).map(emp => {
                                const GRADIENTS = [
                                    'from-violet-500 to-indigo-600', 'from-rose-500 to-pink-600',
                                    'from-amber-500 to-orange-600', 'from-emerald-500 to-teal-600',
                                    'from-sky-500 to-blue-600', 'from-fuchsia-500 to-purple-600',
                                ];
                                const gradient = GRADIENTS[emp.name.charCodeAt(0) % GRADIENTS.length];
                                const isSelected = watch('employeeId') === emp.id;
                                return (
                                    <button key={emp.id} type="button" onClick={() => setValue('employeeId', emp.id!)}
                                        className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition-all w-16 ${isSelected
                                            ? 'border-brand-neon-cyan bg-brand-neon-cyan/10 shadow-[0_0_10px_rgba(0,240,255,0.15)]'
                                            : 'border-white/10 bg-white/3 hover:border-white/20'
                                            }`}
                                    >
                                        {emp.photoUrl ? (
                                            <img src={emp.photoUrl} alt={emp.name} className="w-10 h-10 rounded-full object-cover border border-white/10" />
                                        ) : (
                                            <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold text-sm`}>
                                                {emp.name.charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                        <span className={`text-[10px] leading-tight text-center line-clamp-1 ${isSelected ? 'text-brand-neon-cyan font-semibold' : 'text-slate-400'}`}>
                                            {emp.name.split(' ')[0]}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                        {employees.length === 0 && (
                            <p className="text-xs text-slate-500 italic ml-1">{t('noTeam')}</p>
                        )}
                    </div>

                    {/* Date & Time */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs text-slate-400 font-medium ml-1">{t('date')} <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <CalendarIcon className="absolute left-3 top-2.5 text-slate-500 w-4 h-4" />
                                <input type="date" {...register('date', { required: true })}
                                    className="w-full bg-black/20 border border-white/10 rounded-xl py-2 pl-9 pr-4 text-sm text-white focus:outline-none focus:border-brand-neon-cyan/50" />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-slate-400 font-medium ml-1">{t('time')} <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <Clock className="absolute left-3 top-2.5 text-slate-500 w-4 h-4" />
                                <input type="time" {...register('time', { required: true })}
                                    className="w-full bg-black/20 border border-white/10 rounded-xl py-2 pl-9 pr-4 text-sm text-white focus:outline-none focus:border-brand-neon-cyan/50" />
                            </div>
                        </div>
                    </div>

                    {/* Status (Edit only) */}
                    {appointment && (
                        <div className="space-y-1">
                            <label className="text-xs text-slate-400 font-medium ml-1">{t('status')}</label>
                            <select {...register('status')}
                                className="w-full bg-black/20 border border-white/10 rounded-xl py-2 px-4 text-sm text-white focus:outline-none focus:border-brand-neon-cyan/50"
                            >
                                <option value="confirmed">{t('statusConfirmed')}</option>
                                <option value="pending">{t('statusPending')}</option>
                                <option value="completed">{t('statusCompleted')}</option>
                                <option value="cancelled">{t('statusCancelled')}</option>
                                <option value="no-show">{t('statusNoShow')}</option>
                            </select>
                        </div>
                    )}

                    {/* Notes */}
                    <div className="space-y-1">
                        <label className="text-xs text-slate-400 font-medium ml-1">{t('notes')}</label>
                        <textarea {...register('notes')} rows={3}
                            className="w-full bg-black/20 border border-white/10 rounded-xl py-2 px-4 text-sm text-white focus:outline-none focus:border-brand-neon-cyan/50 resize-none"
                            placeholder={t('notesPlaceholder')} />
                    </div>
                </form>

                {/* Footer */}
                <div className="p-6 border-t border-white/10 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">
                        {t('cancel')}
                    </button>
                    <button
                        onClick={handleSubmit(onSubmit)}
                        disabled={loading}
                        className="px-6 py-2 bg-gradient-to-r from-brand-neon-cyan to-brand-neon-purple text-black font-bold rounded-xl text-sm hover:shadow-[0_0_15px_rgba(0,240,255,0.4)] transition-all disabled:opacity-50"
                    >
                        {loading ? t('saving') : (appointment ? t('saveChanges') : t('create'))}
                    </button>
                </div>
            </div>
        </div>
    );
}
