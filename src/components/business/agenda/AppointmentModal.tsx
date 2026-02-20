import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { X, Calendar as CalendarIcon, Clock, User, Briefcase, Search } from 'lucide-react';
import { format } from 'date-fns';
import { ServiceData } from '@/services/businessProfile.service';
import { EmployeeData } from '@/services/employee.service';
import { Appointment, AppointmentStatus } from '@/services/appointment.service';
import { Customer } from '@/services/customer.service';
import { Timestamp } from 'firebase/firestore';

interface AppointmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (appointment: any) => Promise<void>;
    services: ServiceData[];
    employees: EmployeeData[];
    customers?: Customer[]; // Optional for backward compatibility, but we expect it
    initialDate?: Date;
    initialResource?: string;
    appointment?: Appointment | null; // If editing
}

export default function AppointmentModal({
    isOpen,
    onClose,
    onSave,
    services,
    employees,
    customers = [],
    initialDate,
    initialResource,
    appointment
}: AppointmentModalProps) {
    const [loading, setLoading] = useState(false);
    const [customerSearch, setCustomerSearch] = useState('');
    const [showCustomerResults, setShowCustomerResults] = useState(false);

    const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm({
        defaultValues: {
            customerId: '',
            customerName: '',
            customerPhone: '',
            serviceId: '',
            employeeId: '',
            date: '',
            time: '',
            notes: '',
            status: 'confirmed' as AppointmentStatus
        }
    });

    // Watch values
    const selectedServiceId = watch('serviceId');
    const currentCustomerId = watch('customerId');

    // Dependencies
    useEffect(() => {
        if (isOpen) {
            if (appointment) {
                // Edit Mode
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
                // Initialize search if customer exists
                if (appointment.customerId && appointment.customerName) {
                    setCustomerSearch(appointment.customerName);
                    // Note: In a real typeahead, ID is hidden, Search shows label.
                    // Here we iterate simply.
                }
            } else {
                // Create Mode
                reset({
                    customerId: '',
                    customerName: '',
                    customerPhone: '',
                    serviceId: '',
                    employeeId: initialResource || '',
                    date: initialDate ? format(initialDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
                    time: initialDate ? format(initialDate, 'HH:mm') : '09:00',
                    notes: '',
                    status: 'confirmed'
                });
                setCustomerSearch('');
            }
            setShowCustomerResults(false);
        }
    }, [isOpen, appointment, initialDate, initialResource, reset]);

    // Handle Customer Selection
    const handleSelectCustomer = (customer: Customer) => {
        setValue('customerId', customer.id!); // Use ! if id is optional in Customer interface but expected here
        setValue('customerName', customer.fullName);
        setValue('customerPhone', customer.phone || '');
        setCustomerSearch(customer.fullName);
        setShowCustomerResults(false);
    };

    // Handle Clearing Customer
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
            if (!service) throw new Error("Service not found");

            const startDateTime = new Date(`${data.date}T${data.time}`);

            const appointmentData = {
                ...appointment, // Preserve ID if editing
                customerId: data.customerId || null, // null if empty string
                customerName: data.customerName, // Required fallback
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

    // Filter customers for typeahead
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
                            {appointment ? 'Editar Cita' : 'Nueva Cita'}
                        </h2>
                        <p className="text-sm text-slate-400">
                            {appointment ? 'Modifica los detalles de la reserva' : 'Agenda un servicio para un cliente'}
                        </p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit(onSubmit)} className="p-6 overflow-y-auto custom-scrollbar space-y-4">

                    {/* Customer Selection / Entry */}
                    <div className="space-y-1 relative">
                        <label className="text-xs text-slate-400 font-medium ml-1">Cliente <span className="text-red-500">*</span></label>

                        {/* Hidden ID Field */}
                        <input type="hidden" {...register('customerId')} />

                        <div className="relative">
                            <User className="absolute left-3 top-2.5 text-slate-500 w-4 h-4" />
                            <input
                                value={customerSearch}
                                onChange={(e) => {
                                    setCustomerSearch(e.target.value);
                                    setValue('customerName', e.target.value); // Sync manual input
                                    setValue('customerId', ''); // Clear ID if typing manually
                                    setShowCustomerResults(true);
                                }}
                                onFocus={() => setShowCustomerResults(true)}
                                className="w-full bg-black/20 border border-white/10 rounded-xl py-2 pl-9 pr-10 text-sm text-white focus:outline-none focus:border-brand-neon-cyan/50 focus:ring-1 focus:ring-brand-neon-cyan/50"
                                placeholder="Buscar cliente existente o escribir nombre..."
                                autoComplete="off"
                            />
                            {/* Clear/Status Icon */}
                            {currentCustomerId ? (
                                <button
                                    type="button"
                                    onClick={handleClearCustomer}
                                    className="absolute right-3 top-2.5 text-brand-neon-cyan text-xs font-bold hover:underline"
                                >
                                    Linked
                                </button>
                            ) : (
                                customerSearch && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setCustomerSearch('');
                                            setValue('customerName', '');
                                            setValue('customerId', '');
                                        }}
                                        className="absolute right-3 top-2.5 text-slate-500 hover:text-white"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )
                            )}
                        </div>

                        {/* Typeahead Results */}
                        {showCustomerResults && customerSearch && filteredCustomers.length > 0 && !currentCustomerId && (
                            <div className="absolute z-10 w-full bg-[#151b2e] border border-white/10 rounded-xl shadow-xl mt-1 max-h-40 overflow-y-auto custom-scrollbar">
                                {filteredCustomers.map(c => (
                                    <button
                                        key={c.id}
                                        type="button"
                                        onClick={() => handleSelectCustomer(c)}
                                        className="w-full text-left px-4 py-2 hover:bg-white/5 text-sm flex items-center justify-between group"
                                    >
                                        <div>
                                            <p className="font-medium text-white">{c.fullName}</p>
                                            <p className="text-xs text-slate-500">{c.phone}</p>
                                        </div>
                                        <div className="opacity-0 group-hover:opacity-100 text-brand-neon-cyan text-xs">
                                            Seleccionar
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Manual fields fallback */}
                        {errors.customerName && <p className="text-red-400 text-xs ml-1">El nombre del cliente es obligatorio</p>}
                    </div>

                    {/* Phone (Auto-filled or Manual) */}
                    <div className="space-y-1">
                        <label className="text-xs text-slate-400 font-medium ml-1">Teléfono</label>
                        <input
                            {...register('customerPhone')}
                            className="w-full bg-black/20 border border-white/10 rounded-xl py-2 px-4 text-sm text-white focus:outline-none focus:border-brand-neon-cyan/50"
                            placeholder="+504 9999-9999"
                        />
                    </div>

                    {/* Service Selection */}
                    <div className="space-y-1">
                        <label className="text-xs text-slate-400 font-medium ml-1">Servicio <span className="text-red-500">*</span></label>
                        <div className="relative">
                            <Briefcase className="absolute left-3 top-2.5 text-slate-500 w-4 h-4" />
                            <select
                                {...register('serviceId', { required: 'Selecciona un servicio' })}
                                className="w-full bg-black/20 border border-white/10 rounded-xl py-2 pl-9 pr-4 text-sm text-white focus:outline-none focus:border-brand-neon-cyan/50 appearance-none"
                            >
                                <option value="">Seleccionar servicio...</option>
                                {services.map(s => (
                                    <option key={s.id} value={s.id}>
                                        {s.name} - ${s.price}
                                    </option>
                                ))}
                            </select>
                        </div>
                        {errors.serviceId && <p className="text-red-400 text-xs ml-1">{errors.serviceId.message as string}</p>}
                    </div>

                    {/* Employee Selection */}
                    <div className="space-y-1">
                        <label className="text-xs text-slate-400 font-medium ml-1">Profesional <span className="text-red-500">*</span></label>
                        <div className="relative">
                            <User className="absolute left-3 top-2.5 text-slate-500 w-4 h-4" />
                            <select
                                {...register('employeeId', { required: 'Selecciona un profesional' })}
                                className="w-full bg-black/20 border border-white/10 rounded-xl py-2 pl-9 pr-4 text-sm text-white focus:outline-none focus:border-brand-neon-cyan/50 appearance-none"
                            >
                                <option value="">Cualquiera disponible...</option>
                                {employees.map(e => (
                                    <option key={e.id} value={e.id}>{e.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Date & Time */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs text-slate-400 font-medium ml-1">Fecha <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <CalendarIcon className="absolute left-3 top-2.5 text-slate-500 w-4 h-4" />
                                <input
                                    type="date"
                                    {...register('date', { required: true })}
                                    className="w-full bg-black/20 border border-white/10 rounded-xl py-2 pl-9 pr-4 text-sm text-white focus:outline-none focus:border-brand-neon-cyan/50"
                                />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-slate-400 font-medium ml-1">Hora <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <Clock className="absolute left-3 top-2.5 text-slate-500 w-4 h-4" />
                                <input
                                    type="time"
                                    {...register('time', { required: true })}
                                    className="w-full bg-black/20 border border-white/10 rounded-xl py-2 pl-9 pr-4 text-sm text-white focus:outline-none focus:border-brand-neon-cyan/50"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Status (Edit only) */}
                    {appointment && (
                        <div className="space-y-1">
                            <label className="text-xs text-slate-400 font-medium ml-1">Estado</label>
                            <select
                                {...register('status')}
                                className="w-full bg-black/20 border border-white/10 rounded-xl py-2 px-4 text-sm text-white focus:outline-none focus:border-brand-neon-cyan/50"
                            >
                                <option value="confirmed">Confirmada</option>
                                <option value="pending">Pendiente</option>
                                <option value="completed">Completada</option>
                                <option value="cancelled">Cancelada</option>
                                <option value="no-show">No Asistió</option>
                            </select>
                        </div>
                    )}

                    {/* Notes */}
                    <div className="space-y-1">
                        <label className="text-xs text-slate-400 font-medium ml-1">Notas</label>
                        <textarea
                            {...register('notes')}
                            rows={3}
                            className="w-full bg-black/20 border border-white/10 rounded-xl py-2 px-4 text-sm text-white focus:outline-none focus:border-brand-neon-cyan/50 resize-none"
                            placeholder="Detalles adicionales..."
                        />
                    </div>
                </form>

                {/* Footer */}
                <div className="p-6 border-t border-white/10 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit(onSubmit)}
                        disabled={loading}
                        className="px-6 py-2 bg-gradient-to-r from-brand-neon-cyan to-brand-neon-purple text-black font-bold rounded-xl text-sm hover:shadow-[0_0_15px_rgba(0,240,255,0.4)] transition-all disabled:opacity-50"
                    >
                        {loading ? 'Guardando...' : (appointment ? 'Guardar Cambios' : 'Crear Cita')}
                    </button>
                </div>
            </div>
        </div >
    );
}
