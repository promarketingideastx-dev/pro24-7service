import { useState, useEffect } from 'react';
import { X, Calendar, Clock, User, CheckCircle, ChevronLeft, ChevronRight, Briefcase } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { ServicesService, ServiceData } from '@/services/businessProfile.service';
import { CustomerService } from '@/services/customer.service';
import { AppointmentService } from '@/services/appointment.service';
import { Timestamp } from 'firebase/firestore';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import { WeeklySchedule } from '@/services/employee.service';
import { PaymentSettings } from '@/types/firestore-schema';

interface RequestAppointmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    businessId: string;
    businessName: string;
    openingHours?: WeeklySchedule;
    paymentSettings?: PaymentSettings;
}

type Step = 'service' | 'datetime' | 'payment' | 'contact' | 'review';

export default function RequestAppointmentModal({ isOpen, onClose, businessId, businessName, openingHours, paymentSettings }: RequestAppointmentModalProps) {
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
            setDayStatus({ isOpen: false, message: 'El negocio está cerrado este día.' });
            return;
        }

        setDayStatus({ isOpen: true, message: '' });

        // Generate Slots (Every 30 mins within range)
        const slots: string[] = [];
        const startMin = timeToMinutes(daySchedule.start);
        const endMin = timeToMinutes(daySchedule.end);
        const step = 30;

        for (let time = startMin; time < endMin; time += step) {
            // Convert back to HH:mm for internal storage
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
            // Check if we need to show payment step
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
            toast.warning("Por favor selecciona una fecha y hora para continuar.", {
                style: { background: '#f59e0b', color: 'black', border: 'none' },
                icon: <Calendar size={16} color="black" />
            });
        }
    };


    const onSubmit = async (data: any) => {
        if (!selectedService || !selectedDate || !selectedTime) return;
        setLoading(true);

        try {
            // Auto-sync CRM: Upsert customer (create or update if already exists)
            let customerId: string | undefined = undefined;
            try {
                customerId = await CustomerService.upsertFromAppointment(businessId, {
                    fullName: data.name,
                    phone: data.phone || undefined,
                    email: data.email || undefined,
                });
            } catch (err) {
                // Non-blocking: booking proceeds even if CRM sync fails
                console.warn("CRM sync failed silently:", err);
            }

            const startDateTime = new Date(`${selectedDate}T${selectedTime}`);

            await AppointmentService.createAppointment({
                businessId,
                customerId: customerId,
                customerName: data.name,
                customerPhone: data.phone,
                customerEmail: data.email,
                serviceId: selectedService.id!,
                serviceName: selectedService.name || 'Servicio',
                serviceDuration: selectedService.durationMinutes || 30,
                servicePrice: selectedService.price || 0,
                employeeId: 'pending',
                date: Timestamp.fromDate(startDateTime),
                status: 'pending',
                notes: data.notes,
            });

            toast.success("¡Solicitud enviada con éxito!");
            onClose();
            setStep('service');
            setSelectedService(null);
            setSelectedDate('');
            setSelectedTime('');
            setAvailableSlots([]);

        } catch (error) {
            console.error("Error booking:", error);
            toast.error("Error al enviar solicitud");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center sm:p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-[#1e5555] border border-white/10 rounded-t-3xl sm:rounded-2xl w-full max-w-lg shadow-2xl relative flex flex-col max-h-[95vh] sm:max-h-[90vh] overflow-hidden">

                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        {step !== 'service' && (
                            <button onClick={() => {
                                if (step === 'datetime') setStep('service');
                                if (step === 'payment') setStep('datetime');
                                if (step === 'contact') {
                                    // Go back to payment if enabled, else datetime
                                    const hasPayment = paymentSettings && (
                                        paymentSettings.acceptsCash ||
                                        paymentSettings.acceptsBankTransfer ||
                                        paymentSettings.acceptsDigitalWallet ||
                                        paymentSettings.requiresDeposit
                                    );
                                    setStep(hasPayment ? 'payment' : 'datetime');
                                }
                            }} className="p-1 hover:bg-white/10 rounded-full">
                                <ChevronLeft className="w-5 h-5 text-white" />
                            </button>
                        )}
                        <h2 className="text-lg font-bold text-white">Agendar Cita</h2>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white">
                        <X size={24} />
                    </button>
                </div>

                {/* Progress Bar */}
                <div className="flex gap-1 p-1 bg-black/20">
                    <div className={`h-1 flex-1 rounded-full ${['service', 'datetime', 'payment', 'contact'].includes(step) ? 'bg-brand-neon-cyan' : 'bg-white/10'}`} />
                    <div className={`h-1 flex-1 rounded-full ${['datetime', 'payment', 'contact'].includes(step) ? 'bg-brand-neon-cyan' : 'bg-white/10'}`} />
                    <div className={`h-1 flex-1 rounded-full ${['payment', 'contact'].includes(step) ? 'bg-brand-neon-cyan' : 'bg-white/10'}`} />
                    <div className={`h-1 flex-1 rounded-full ${['contact'].includes(step) ? 'bg-brand-neon-cyan' : 'bg-white/10'}`} />
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-5 sm:p-6 pb-20 sm:pb-8 custom-scrollbar">

                    {/* STEP 1: SERVICE */}
                    {step === 'service' && (
                        <div className="space-y-4">
                            <h3 className="text-white font-medium mb-4">Selecciona un servicio</h3>
                            {services.length === 0 ? (
                                <p className="text-slate-500 text-center py-8">No hay servicios disponibles.</p>
                            ) : (
                                <div className="space-y-2">
                                    {services.map(service => (
                                        <button
                                            key={service.id}
                                            onClick={() => handleServiceSelect(service)}
                                            className="w-full p-4 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-brand-neon-cyan/50 rounded-xl flex justify-between items-center transition-all group"
                                        >
                                            <div className="text-left">
                                                <p className="font-bold text-white group-hover:text-brand-neon-cyan transition-colors">{service.name}</p>
                                                <p className="text-sm text-slate-400">${service.price}</p>
                                            </div>
                                            <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-brand-neon-cyan" />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* STEP 2: DATE & TIME */}
                    {step === 'datetime' && (
                        <div className="space-y-6">
                            <div className="space-y-3">
                                <label className="text-white text-sm font-semibold flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-brand-neon-cyan" />
                                    Fecha Preferida
                                </label>
                                <div className="relative group">
                                    {/* Glowing border effect */}
                                    <div className="absolute inset-0 rounded-xl bg-brand-neon-cyan/10 blur-sm opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none" />

                                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-neon-cyan w-5 h-5 z-10 pointer-events-none" />

                                    <input
                                        type="date"
                                        min={new Date().toISOString().split('T')[0]}
                                        value={selectedDate}
                                        onChange={handleDateChange}
                                        className="styled-date w-full bg-[#0f1623] border-2 border-brand-neon-cyan/40 hover:border-brand-neon-cyan/70 focus:border-brand-neon-cyan rounded-xl py-4 pl-12 pr-36 text-white text-base focus:outline-none transition-all cursor-pointer"
                                    />

                                    {/* Visible "open calendar" CTA — stretched native indicator sits on top */}
                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2 bg-brand-neon-cyan/20 border border-brand-neon-cyan/50 rounded-xl px-4 py-2">
                                        <Calendar className="w-5 h-5 text-brand-neon-cyan" />
                                        <span className="text-brand-neon-cyan text-sm font-bold whitespace-nowrap">Abrir</span>
                                    </div>
                                </div>
                                {!dayStatus.isOpen && selectedDate && (
                                    <div className="flex items-center gap-2 text-amber-500 text-sm bg-amber-500/10 p-3 rounded-lg border border-amber-500/20">
                                        <Briefcase size={16} />
                                        {dayStatus.message}
                                    </div>
                                )}
                            </div>


                            <div className="space-y-2">
                                <label className="text-slate-400 text-sm">Horarios Disponibles</label>
                                {!selectedDate ? (
                                    <p className="text-slate-500 text-sm italic">Selecciona una fecha para ver horarios.</p>
                                ) : !dayStatus.isOpen ? (
                                    <p className="text-slate-500 text-sm italic">El negocio está cerrado en esta fecha.</p>
                                ) : availableSlots.length === 0 ? (
                                    <p className="text-slate-500 text-sm italic">No hay horarios disponibles.</p>
                                ) : (
                                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                        {availableSlots.map((time) => {
                                            const displayTime = minutesToTime(timeToMinutes(time));
                                            const isSelected = selectedTime === time;

                                            return (
                                                <button
                                                    key={time}
                                                    onClick={() => handleTimeSelect(time)}
                                                    className={`py-2 px-1 text-sm rounded-lg border transition-all ${isSelected
                                                        ? 'bg-brand-neon-cyan text-black border-brand-neon-cyan font-bold shadow-lg shadow-cyan-500/20'
                                                        : 'bg-white/5 border-white/10 text-white hover:bg-white/10 hover:border-white/20'
                                                        }`}
                                                >
                                                    {displayTime}
                                                </button>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={handleDateTimeSubmit}
                                disabled={!selectedDate || !selectedTime}
                                className={`w-full py-3 font-bold rounded-xl mt-4 transition-all ${(!selectedDate || !selectedTime)
                                    ? 'bg-white/10 text-slate-500 cursor-not-allowed'
                                    : 'bg-brand-neon-cyan text-black hover:opacity-90 hover:shadow-lg hover:shadow-cyan-500/30'
                                    }`}
                            >
                                Continuar
                            </button>
                        </div>
                    )}

                    {/* STEP 2.5: PAYMENT INFO */}
                    {step === 'payment' && paymentSettings && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <h3 className="text-white font-medium mb-4">Información de Pago</h3>

                            {/* Deposit Warning */}
                            {paymentSettings.requiresDeposit && (
                                <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl mb-4">
                                    <h4 className="text-yellow-500 font-bold text-sm mb-1 flex items-center gap-2">
                                        <Briefcase size={16} />
                                        Política de Anticipo
                                    </h4>
                                    <p className="text-slate-300 text-sm mb-2">
                                        Este negocio requiere un anticipo para confirmar la cita.
                                    </p>
                                    <div className="bg-black/20 p-3 rounded-lg flex justify-between items-center">
                                        <span className="text-slate-400 text-sm">Monto Requerido:</span>
                                        <span className="text-white font-bold">
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
                                <label className="text-slate-400 text-sm">Métodos Aceptados:</label>
                                <div className="grid grid-cols-1 gap-3">
                                    {paymentSettings.acceptsCash && (
                                        <div className="p-3 bg-white/5 border border-white/10 rounded-xl flex items-center gap-3">
                                            <div className="p-2 bg-green-500/10 rounded-lg text-green-500">
                                                <Briefcase className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <p className="text-white font-medium text-sm">Efectivo</p>
                                                <p className="text-xs text-slate-500">Pago en el local</p>
                                            </div>
                                        </div>
                                    )}
                                    {paymentSettings.acceptsBankTransfer && (
                                        <div className="p-3 bg-white/5 border border-white/10 rounded-xl">
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
                                                    <Briefcase className="w-4 h-4" />
                                                </div>
                                                <p className="text-white font-medium text-sm">Transferencia Bancaria</p>
                                            </div>
                                            {paymentSettings.bankTransferDetails && (
                                                <div className="bg-black/20 p-2 rounded text-xs text-slate-400 whitespace-pre-line">
                                                    {paymentSettings.bankTransferDetails}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {paymentSettings.acceptsDigitalWallet && (
                                        <div className="p-3 bg-white/5 border border-white/10 rounded-xl">
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="p-2 bg-purple-500/10 rounded-lg text-purple-500">
                                                    <Briefcase className="w-4 h-4" />
                                                </div>
                                                <p className="text-white font-medium text-sm">Billetera Digital</p>
                                            </div>
                                            {paymentSettings.digitalWalletDetails && (
                                                <div className="bg-black/20 p-2 rounded text-xs text-slate-400 whitespace-pre-line">
                                                    {paymentSettings.digitalWalletDetails}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <button
                                onClick={() => setStep('contact')}
                                className="w-full py-3 bg-brand-neon-cyan text-black font-bold rounded-xl mt-4 hover:shadow-lg hover:shadow-cyan-500/30 transition-all"
                            >
                                Entendido, Continuar
                            </button>
                        </div>
                    )}

                    {/* STEP 3: CONTACT & CONFIRM */}
                    {step === 'contact' && (
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                            <div className="p-4 bg-brand-neon-cyan/10 border border-brand-neon-cyan/20 rounded-xl mb-6">
                                <h4 className="text-brand-neon-cyan font-bold text-sm mb-1">Resumen de Solicitud</h4>
                                <p className="text-white text-sm">{selectedService?.name}</p>
                                <p className="text-slate-400 text-xs flex gap-2 mt-1">
                                    <Calendar size={12} className="mt-0.5" />
                                    {format(new Date(`${selectedDate}T${selectedTime}`), 'PPP', { locale: es })}
                                    <span className="mx-1">•</span>
                                    <Clock size={12} className="mt-0.5" />
                                    {minutesToTime(timeToMinutes(selectedTime))}
                                </p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-slate-400 text-sm">Tu Nombre <span className="text-red-500">*</span></label>
                                <input
                                    {...register('name', { required: true })}
                                    className="w-full bg-black/20 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-brand-neon-cyan text-base"
                                    placeholder="Ej. Juan Pérez"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-slate-400 text-sm">Teléfono <span className="text-red-500">*</span></label>
                                <input
                                    {...register('phone', { required: true })}
                                    className="w-full bg-black/20 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-brand-neon-cyan text-base"
                                    placeholder="+504..."
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-slate-400 text-sm">Email (Opcional)</label>
                                <input
                                    {...register('email')}
                                    className="w-full bg-black/20 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-brand-neon-cyan text-base"
                                    placeholder="juan@ejemplo.com"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-slate-400 text-sm">Notas</label>
                                <textarea
                                    {...register('notes')}
                                    rows={2}
                                    className="w-full bg-black/20 border border-white/10 rounded-xl py-2 px-4 text-white focus:outline-none focus:border-brand-neon-cyan resize-none"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-4 bg-gradient-to-r from-brand-neon-cyan to-brand-neon-purple text-black font-bold rounded-xl mt-4 hover:shadow-[0_0_15px_rgba(0,240,255,0.4)] transition-all flex items-center justify-center gap-2 text-base"
                            >
                                {loading ? 'Enviando...' : 'Confirmar Solicitud'}
                            </button>
                        </form>
                    )}

                </div>
            </div>
        </div>
    );
}
