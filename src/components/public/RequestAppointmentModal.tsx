import { useState, useEffect } from 'react';
import { X, Calendar, Clock, User, CheckCircle, ChevronLeft, ChevronRight, Briefcase } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { ServicesService, ServiceData } from '@/services/businessProfile.service';
import { CustomerService } from '@/services/customer.service';
import { AppointmentService } from '@/services/appointment.service';
import { Timestamp } from 'firebase/firestore';
import { format } from 'date-fns';
import { es, enUS, ptBR } from 'date-fns/locale';
import { useLocale, useTranslations } from 'next-intl';
import { useAuth } from '@/context/AuthContext';

import { WeeklySchedule } from '@/services/employee.service';
import { PaymentSettings } from '@/types/firestore-schema';
import { AnalyticsService } from '@/services/analytics.service';


interface RequestAppointmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    businessId: string;
    businessName: string;
    openingHours?: WeeklySchedule;
    paymentSettings?: PaymentSettings;
}

type Step = 'service' | 'datetime' | 'payment' | 'contact' | 'review';

// ── Days / Months per locale ──────────────────────────────────────────────
const DAYS: Record<string, string[]> = {
    es: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'],
    en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    pt: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'],
};
const MONTHS: Record<string, string[]> = {
    es: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
    en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    pt: ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'],
};

interface DateTimeStepProps {
    selectedDate: string;
    selectedTime: string;
    availableSlots: string[];
    dayStatus: { isOpen: boolean; message: string };
    onDateChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onTimeSelect: (t: string) => void;
    onSubmit: () => void;
    minutesToTime: (m: number) => string;
    timeToMinutes: (t: string) => number;
    t: (key: string, values?: any) => string;
    localeKey: string;
}

function DateTimeStep({ selectedDate, selectedTime, availableSlots, dayStatus, onDateChange, onTimeSelect, onSubmit, minutesToTime, timeToMinutes, t, localeKey }: DateTimeStepProps) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [calYear, setCalYear] = useState(today.getFullYear());
    const [calMonth, setCalMonth] = useState(today.getMonth());

    const days = DAYS[localeKey] || DAYS.es;
    const months = MONTHS[localeKey] || MONTHS.es;

    // Build day grid
    const firstDay = new Date(calYear, calMonth, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const cells: (number | null)[] = [
        ...Array(firstDay).fill(null),
        ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ];
    // Pad to full weeks
    while (cells.length % 7 !== 0) cells.push(null);

    const toDateStr = (day: number) => {
        const m = String(calMonth + 1).padStart(2, '0');
        const d = String(day).padStart(2, '0');
        return `${calYear}-${m}-${d}`;
    };

    const handleDayClick = (day: number) => {
        const dateStr = toDateStr(day);
        const cellDate = new Date(`${dateStr}T12:00:00`);
        if (cellDate < today) return; // disabled — past
        const syntheticEvent = { target: { value: dateStr } } as React.ChangeEvent<HTMLInputElement>;
        onDateChange(syntheticEvent);
    };

    const prevMonth = () => {
        if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); }
        else setCalMonth(m => m - 1);
    };
    const nextMonth = () => {
        if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); }
        else setCalMonth(m => m + 1);
    };

    return (
        <div className="space-y-5">
            {/* Calendar card */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                {/* Month header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
                    <button onClick={prevMonth} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-800">
                        <ChevronLeft size={18} />
                    </button>
                    <span className="text-slate-900 font-semibold text-sm">
                        {months[calMonth]} {calYear}
                    </span>
                    <button onClick={nextMonth} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-800">
                        <ChevronRight size={18} />
                    </button>
                </div>

                {/* Day names */}
                <div className="grid grid-cols-7 px-2 pt-2">
                    {days.map(d => (
                        <div key={d} className="text-center text-[10px] font-semibold text-slate-500 uppercase py-1">{d}</div>
                    ))}
                </div>

                {/* Day cells */}
                <div className="grid grid-cols-7 gap-0.5 px-2 pb-3">
                    {cells.map((day, i) => {
                        if (!day) return <div key={i} />;
                        const dateStr = toDateStr(day);
                        const cellDate = new Date(`${dateStr}T12:00:00`);
                        const isPast = cellDate < today;
                        const isSelected = dateStr === selectedDate;
                        const isToday = cellDate.toDateString() === today.toDateString();

                        return (
                            <button
                                key={i}
                                disabled={isPast}
                                onClick={() => handleDayClick(day)}
                                className={`
                                    relative h-9 w-full flex items-center justify-center rounded-xl text-sm font-medium transition-all
                                    ${isPast ? 'text-slate-300 cursor-not-allowed' : 'cursor-pointer hover:bg-slate-100'}
                                    ${isSelected ? 'bg-[#14B8A6] text-white font-bold shadow-md hover:bg-[#0F9488]' : ''}
                                    ${isToday && !isSelected ? 'ring-1 ring-[#14B8A6]/50 text-[#14B8A6] font-semibold' : ''}
                                    ${!isPast && !isSelected ? 'text-slate-800' : ''}
                                `}
                            >
                                {day}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Selected date display */}
            {selectedDate && (
                <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-xl border ${dayStatus.isOpen ? 'bg-[#14B8A6]/8 border-[#14B8A6]/20 text-[#14B8A6]' : 'bg-amber-500/10 border-amber-500/20 text-amber-400'}`}>
                    <Calendar size={14} className="shrink-0" />
                    <span>
                        {dayStatus.isOpen
                            ? `${selectedDate} — ${t('available')}`
                            : dayStatus.message}
                    </span>
                </div>
            )}

            {/* Time slots */}
            <div className="space-y-2">
                <label className="text-slate-900 text-sm font-semibold flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#14B8A6]" />
                    {t('schedule')}
                </label>
                {!selectedDate ? (
                    <p className="text-slate-500 text-sm italic text-center py-3">← {t('selectDateFirst')}</p>
                ) : !dayStatus.isOpen ? (
                    <p className="text-slate-500 text-sm italic text-center py-3">{t('closedThisDay')}</p>
                ) : availableSlots.length === 0 ? (
                    <p className="text-slate-500 text-sm italic text-center py-3">{t('noSlots')}</p>
                ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {availableSlots.map(time => {
                            const display = minutesToTime(timeToMinutes(time));
                            const active = selectedTime === time;
                            return (
                                <button key={time} onClick={() => onTimeSelect(time)}
                                    className={`py-2.5 px-1 text-sm rounded-xl border font-medium transition-all ${active
                                        ? 'bg-[#14B8A6] text-black border-[#14B8A6] shadow-lg shadow-cyan-500/20'
                                        : 'bg-slate-50 border-slate-200 text-slate-900 hover:bg-slate-100 hover:border-[#14B8A6]/30'
                                        }`}>
                                    {display}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            <button
                onClick={onSubmit}
                disabled={!selectedDate || !selectedTime}
                className={`w-full py-3.5 font-bold rounded-xl transition-all text-base ${(!selectedDate || !selectedTime)
                    ? 'bg-slate-100 text-slate-500 cursor-not-allowed'
                    : 'bg-[#14B8A6] text-black hover:opacity-90 hover:shadow-lg hover:shadow-cyan-500/30'
                    }`}
            >
                {selectedDate && selectedTime ? `${t('continue')} → ${selectedDate}` : t('continue')}
            </button>
        </div>
    );
}


export default function RequestAppointmentModal({ isOpen, onClose, businessId, businessName, openingHours, paymentSettings }: RequestAppointmentModalProps) {
    const { user } = useAuth();
    const t = useTranslations('booking');
    const locale = useLocale();
    const localeKey = locale === 'en' ? 'en' : locale === 'pt-BR' ? 'pt' : 'es';
    const dateFnsLocale = locale === 'en' ? enUS : locale === 'pt-BR' ? ptBR : es;

    const [step, setStep] = useState<Step>('service');
    const [loading, setLoading] = useState(false);
    const [services, setServices] = useState<ServiceData[]>([]);
    const [selectedService, setSelectedService] = useState<ServiceData | null>(null);
    const [selectedDate, setSelectedDate] = useState('');
    const [selectedTime, setSelectedTime] = useState('');
    const [availableSlots, setAvailableSlots] = useState<string[]>([]);
    const [dayStatus, setDayStatus] = useState<{ isOpen: boolean; message: string }>({ isOpen: true, message: '' });

    const { register, handleSubmit, formState: { errors } } = useForm({
        defaultValues: {
            name: '',
            phone: '',
            email: '',
            notes: ''
        }
    });

    // Helpers
    const getDayKey = (dateStr: string) => {
        const date = new Date(`${dateStr}T12:00:00`);
        const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
        return days[date.getDay()];
    };

    const timeToMinutes = (t: string) => {
        const [h, m] = t.split(':').map(Number);
        return h * 60 + m;
    };

    const minutesToTime = (m: number) => {
        const h = Math.floor(m / 60);
        const min = m % 60;
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        return `${h12}:${min.toString().padStart(2, '0')} ${ampm}`;
    };

    // Fetch services on open
    useEffect(() => {
        if (isOpen && businessId) {
            ServicesService.getServices(businessId)
                .then(setServices)
                .catch(console.error);
        }
    }, [isOpen, businessId]);

    const handleServiceSelect = (service: ServiceData) => {
        setSelectedService(service);
        setStep('datetime');
        AnalyticsService.track({ type: 'booking_step_service', businessId });
    };


    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const dateStr = e.target.value;
        setSelectedDate(dateStr);
        setSelectedTime('');
        setAvailableSlots([]);

        if (!openingHours || !dateStr) return;

        const dayKey = getDayKey(dateStr);
        const daySchedule = openingHours[dayKey as keyof WeeklySchedule];

        if (!daySchedule || !daySchedule.enabled) {
            setDayStatus({ isOpen: false, message: t('businessClosedThisDay') });
            return;
        }

        setDayStatus({ isOpen: true, message: '' });

        // Generate Slots (Every 30 mins within range)
        const slots: string[] = [];
        const startMin = timeToMinutes(daySchedule.start);
        const endMin = timeToMinutes(daySchedule.end);
        const step = 30;

        for (let time = startMin; time < endMin; time += step) {
            const h = Math.floor(time / 60);
            const m = time % 60;
            const timeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
            slots.push(timeStr);
        }
        setAvailableSlots(slots);
    };

    const handleTimeSelect = (time: string) => {
        setSelectedTime(time);
    };

    const handleDateTimeSubmit = () => {
        if (selectedDate && selectedTime) {
            const hasPaymentSettings = paymentSettings && (
                paymentSettings.acceptsCash ||
                paymentSettings.acceptsBankTransfer ||
                paymentSettings.acceptsDigitalWallet ||
                paymentSettings.requiresDeposit
            );

            if (hasPaymentSettings) {
                setStep('payment');
            } else {
                setStep('contact');
            }
        } else {
            toast.warning(t('selectDateTimeWarning'), {
                style: { background: '#f59e0b', color: 'black', border: 'none' },
                icon: <Calendar size={16} color="black" />,
            });
        }
    };


    const onSubmit = async (data: any) => {
        if (!selectedService || !selectedDate || !selectedTime) return;
        setLoading(true);

        try {
            let customerId: string | undefined = undefined;
            try {
                customerId = await CustomerService.upsertFromAppointment(businessId, {
                    fullName: data.name,
                    phone: data.phone || undefined,
                    email: data.email || undefined,
                });
            } catch (err) {
                console.warn("CRM sync failed silently:", err);
            }

            const startDateTime = new Date(`${selectedDate}T${selectedTime}`);

            await AppointmentService.createAppointment({
                businessId,
                customerId: customerId,
                customerUid: user?.uid || undefined,
                customerName: data.name,
                customerPhone: data.phone,
                customerEmail: data.email,
                serviceId: selectedService.id!,
                serviceName: selectedService.name || t('service'),
                serviceDuration: selectedService.durationMinutes || 30,
                servicePrice: selectedService.price || 0,
                employeeId: 'pending',
                date: Timestamp.fromDate(startDateTime),
                status: 'pending',
                notes: data.notes,
            });

            toast.success(t('requestSent'));
            onClose();
            setStep('service');
            setSelectedService(null);
            setSelectedDate('');
            setSelectedTime('');
            setAvailableSlots([]);

        } catch (error) {
            console.error("Error booking:", error);
            toast.error(t('requestError'));
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white border border-slate-200 rounded-t-3xl sm:rounded-2xl w-full max-w-lg shadow-2xl relative flex flex-col max-h-[95vh] sm:max-h-[90vh] overflow-hidden">

                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-200">
                    <div className="flex items-center gap-3">
                        {step !== 'service' && (
                            <button onClick={() => {
                                if (step === 'datetime') setStep('service');
                                if (step === 'payment') setStep('datetime');
                                if (step === 'contact') {
                                    const hasPayment = paymentSettings && (
                                        paymentSettings.acceptsCash ||
                                        paymentSettings.acceptsBankTransfer ||
                                        paymentSettings.acceptsDigitalWallet ||
                                        paymentSettings.requiresDeposit
                                    );
                                    setStep(hasPayment ? 'payment' : 'datetime');
                                }
                            }} className="p-1 hover:bg-slate-100 rounded-full">
                                <ChevronLeft className="w-5 h-5 text-slate-900" />
                            </button>
                        )}
                        <h2 className="text-lg font-bold text-slate-900">{t('title')}</h2>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-800">
                        <X size={24} />
                    </button>
                </div>

                {/* Progress Bar */}
                <div className="flex gap-1 p-1 bg-slate-50">
                    <div className={`h-1 flex-1 rounded-full ${['service', 'datetime', 'payment', 'contact'].includes(step) ? 'bg-[#14B8A6]' : 'bg-slate-100'}`} />
                    <div className={`h-1 flex-1 rounded-full ${['datetime', 'payment', 'contact'].includes(step) ? 'bg-[#14B8A6]' : 'bg-slate-100'}`} />
                    <div className={`h-1 flex-1 rounded-full ${['payment', 'contact'].includes(step) ? 'bg-[#14B8A6]' : 'bg-slate-100'}`} />
                    <div className={`h-1 flex-1 rounded-full ${['contact'].includes(step) ? 'bg-[#14B8A6]' : 'bg-slate-100'}`} />
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-5 sm:p-6 pb-20 sm:pb-8 custom-scrollbar">

                    {/* STEP 1: SERVICE */}
                    {step === 'service' && (
                        <div className="space-y-4">
                            <h3 className="text-slate-900 font-medium mb-4">{t('selectService')}</h3>
                            {services.length === 0 ? (
                                <p className="text-slate-500 text-center py-8">{t('noServices')}</p>
                            ) : (
                                <div className="space-y-2">
                                    {services.map(service => (
                                        <button
                                            key={service.id}
                                            onClick={() => handleServiceSelect(service)}
                                            className="w-full p-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-[#14B8A6]/50 rounded-xl flex justify-between items-center transition-all group"
                                        >
                                            <div className="text-left">
                                                <p className="font-bold text-slate-900 group-hover:text-[#14B8A6] transition-colors">{service.name}</p>
                                                <p className="text-sm text-slate-400">${service.price}</p>
                                            </div>
                                            <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-[#14B8A6]" />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* STEP 2: DATE & TIME */}
                    {step === 'datetime' && (
                        <DateTimeStep
                            selectedDate={selectedDate}
                            selectedTime={selectedTime}
                            availableSlots={availableSlots}
                            dayStatus={dayStatus}
                            onDateChange={handleDateChange}
                            onTimeSelect={handleTimeSelect}
                            onSubmit={handleDateTimeSubmit}
                            minutesToTime={minutesToTime}
                            timeToMinutes={timeToMinutes}
                            t={t as any}
                            localeKey={localeKey}
                        />
                    )}

                    {/* STEP 2.5: PAYMENT INFO */}
                    {step === 'payment' && paymentSettings && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <h3 className="text-slate-900 font-medium mb-4">{t('paymentInfo')}</h3>

                            {/* Deposit Warning */}
                            {paymentSettings.requiresDeposit && (
                                <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl mb-4">
                                    <h4 className="text-yellow-500 font-bold text-sm mb-1 flex items-center gap-2">
                                        <Briefcase size={16} />
                                        {t('depositPolicy')}
                                    </h4>
                                    <p className="text-slate-600 text-sm mb-2">
                                        {t('depositRequired')}
                                    </p>
                                    <div className="bg-slate-50 p-3 rounded-lg flex justify-between items-center">
                                        <span className="text-slate-400 text-sm">{t('requiredAmount')}:</span>
                                        <span className="text-slate-900 font-bold">
                                            {paymentSettings.depositType === 'percent'
                                                ? `${paymentSettings.depositValue}%`
                                                : `L. ${paymentSettings.depositValue}`
                                            }
                                        </span>
                                    </div>
                                    {paymentSettings.depositNotes && (
                                        <p className="text-xs text-slate-400 mt-2 italic">"{paymentSettings.depositNotes}"</p>
                                    )}
                                </div>
                            )}

                            <div className="space-y-3">
                                <label className="text-slate-700 text-sm font-semibold">{t('acceptedMethods')}:</label>
                                <div className="grid grid-cols-1 gap-3">
                                    {paymentSettings.acceptsCash && (
                                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3">
                                            <div className="p-2 bg-green-500/10 rounded-lg text-green-500">
                                                <Briefcase className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <p className="text-slate-900 font-medium text-sm">{t('cash')}</p>
                                                <p className="text-xs text-slate-500">{t('cashInStore')}</p>
                                            </div>
                                        </div>
                                    )}
                                    {paymentSettings.acceptsBankTransfer && (
                                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
                                                    <Briefcase className="w-4 h-4" />
                                                </div>
                                                <p className="text-slate-900 font-medium text-sm">{t('bankTransfer')}</p>
                                            </div>
                                            {paymentSettings.bankTransferDetails && (
                                                <div className="bg-slate-50 p-2 rounded text-xs text-slate-400 whitespace-pre-line">
                                                    {paymentSettings.bankTransferDetails}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {paymentSettings.acceptsDigitalWallet && (
                                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="p-2 bg-purple-500/10 rounded-lg text-purple-500">
                                                    <Briefcase className="w-4 h-4" />
                                                </div>
                                                <p className="text-slate-900 font-medium text-sm">{t('digitalWallet')}</p>
                                            </div>
                                            {paymentSettings.digitalWalletDetails && (
                                                <div className="bg-slate-50 p-2 rounded text-xs text-slate-400 whitespace-pre-line">
                                                    {paymentSettings.digitalWalletDetails}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <button
                                onClick={() => setStep('contact')}
                                className="w-full py-3 bg-[#14B8A6] text-black font-bold rounded-xl mt-4 hover:shadow-lg hover:shadow-cyan-500/30 transition-all"
                            >
                                {t('understoodContinue')}
                            </button>
                        </div>
                    )}

                    {/* STEP 3: CONTACT & CONFIRM */}
                    {step === 'contact' && (
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                            <div className="p-4 bg-[#14B8A6]/10 border border-[#14B8A6]/20 rounded-xl mb-6">
                                <h4 className="text-[#14B8A6] font-bold text-sm mb-1">{t('requestSummary')}</h4>
                                <p className="text-slate-900 text-sm">{selectedService?.name}</p>
                                <p className="text-slate-400 text-xs flex gap-2 mt-1">
                                    <Calendar size={12} className="mt-0.5" />
                                    {format(new Date(`${selectedDate}T${selectedTime}`), 'PPP', { locale: dateFnsLocale })}
                                    <span className="mx-1">•</span>
                                    <Clock size={12} className="mt-0.5" />
                                    {minutesToTime(timeToMinutes(selectedTime))}
                                </p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-slate-400 text-sm">{t('yourName')} <span className="text-red-500">*</span></label>
                                <input
                                    {...register('name', { required: true })}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-slate-900 focus:outline-none focus:border-[#14B8A6] text-base"
                                    placeholder={t('namePlaceholder')}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-slate-400 text-sm">{t('phone')} <span className="text-red-500">*</span></label>
                                <input
                                    {...register('phone', { required: true })}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-slate-900 focus:outline-none focus:border-[#14B8A6] text-base"
                                    placeholder="+504..."
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-slate-400 text-sm">{t('email')} ({t('optional')})</label>
                                <input
                                    {...register('email')}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-slate-900 focus:outline-none focus:border-[#14B8A6] text-base"
                                    placeholder={t('emailPlaceholder')}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-slate-400 text-sm">{t('notes')}</label>
                                <textarea
                                    {...register('notes')}
                                    rows={2}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-4 text-slate-900 focus:outline-none focus:border-[#14B8A6] resize-none"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-4 bg-gradient-to-r from-[#14B8A6] to-[#2563EB] text-black font-bold rounded-xl mt-4 hover:shadow-[0_0_15px_rgba(0,240,255,0.4)] transition-all flex items-center justify-center gap-2 text-base"
                            >
                                {loading ? t('sending') : t('confirmRequest')}
                            </button>
                        </form>
                    )}

                </div>
            </div>
        </div>
    );
}
