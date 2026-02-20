'use client';

import { useState, useEffect } from 'react';
import CalendarHeader, { CalendarView } from '@/components/business/agenda/CalendarHeader';
import CalendarGrid from '@/components/business/agenda/CalendarGrid';
import AppointmentModal from '@/components/business/agenda/AppointmentModal';
import { useAuth } from '@/context/AuthContext';
import { AppointmentService, Appointment } from '@/services/appointment.service';
import { ServicesService, ServiceData } from '@/services/businessProfile.service';
import { EmployeeService, EmployeeData } from '@/services/employee.service';
import { CustomerService, Customer } from '@/services/customer.service';
import { startOfWeek, endOfWeek, startOfDay, endOfDay } from 'date-fns';
import { toast } from 'sonner';
import { ActiveCountry } from '@/lib/activeCountry';
import { getCountryConfig } from '@/lib/locations';
import { useAppointmentRefresh } from '@/context/AppointmentRefreshContext';

export default function AgendaPage() {
    const { user } = useAuth();
    // Get Time Format based on active country
    const countryCode = ActiveCountry.get();
    const countryConfig = getCountryConfig(countryCode);
    const timeFormat = countryConfig.timeFormat || '12h';
    const [currentDate, setCurrentDate] = useState(new Date());
    const [view, setView] = useState<CalendarView>('resource');
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [services, setServices] = useState<ServiceData[]>([]);
    const [employees, setEmployees] = useState<EmployeeData[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
    const { lastRefresh } = useAppointmentRefresh();

    // Fetch dependencies
    useEffect(() => {
        const fetchDependencies = async () => {
            if (!user) return;
            try {
                const [servicesData, employeesData, customersData] = await Promise.all([
                    ServicesService.getServices(user.uid),
                    EmployeeService.getEmployees(user.uid),
                    CustomerService.getCustomers(user.uid)
                ]);
                setServices(servicesData);
                setEmployees(employeesData);
                setCustomers(customersData);
            } catch (error) {
                console.error("Error fetching dependencies:", error);
            }
        };
        fetchDependencies();
    }, [user]);

    // Fetch Appointments
    const fetchAppointments = async () => {
        if (!user) return;
        try {
            let start = startOfDay(currentDate);
            let end = endOfDay(currentDate);

            if (view === 'week') {
                start = startOfWeek(currentDate, { weekStartsOn: 1 });
                end = endOfWeek(currentDate, { weekStartsOn: 1 });
            }

            const data = await AppointmentService.getAppointments(user.uid, start, end);
            setAppointments(data);
        } catch (error) {
            console.error("Error fetching appointments:", error);
            toast.error("Error al cargar citas");
        }
    };

    useEffect(() => {
        fetchAppointments();
    }, [user, currentDate, view]);

    // Listen to global refresh signal from Inbox (cross-page bridge)
    useEffect(() => {
        if (lastRefresh > 0) {
            fetchAppointments();
        }
    }, [lastRefresh]);

    const handleSaveAppointment = async (appointmentData: any) => {
        if (!user) return;
        try {
            if (appointmentData.id) {
                await AppointmentService.updateAppointment(appointmentData.id, appointmentData);
                toast.success("Cita actualizada");
            } else {
                await AppointmentService.createAppointment({
                    ...appointmentData,
                    businessId: user.uid
                });
                toast.success("Cita creada");
            }
            fetchAppointments();
            setIsModalOpen(false);
        } catch (error) {
            console.error(error);
            toast.error("Error al guardar la cita");
        }
    };

    const [selectedSlot, setSelectedSlot] = useState<{ date: Date; resourceId?: string } | null>(null);

    const handleOpenCreate = (date?: Date, resourceId?: string) => {
        setSelectedAppointment(null);
        setSelectedSlot(date ? { date, resourceId } : null);
        setIsModalOpen(true);
    };

    const handleOpenEdit = (apt: Appointment) => {
        setSelectedAppointment(apt);
        setIsModalOpen(true);
    };

    return (
        <div className="h-[calc(100vh-80px)] md:h-[calc(100vh-64px)] flex flex-col relative">
            <CalendarHeader
                currentDate={currentDate}
                view={view}
                onViewChange={setView}
                onDateChange={setCurrentDate}
                onToday={() => setCurrentDate(new Date())}
            />

            <div className="flex-1 overflow-hidden relative border border-white/10 rounded-2xl bg-[#0F131F]">
                <CalendarGrid
                    date={currentDate}
                    view={view}
                    appointments={appointments}
                    onAppointmentClick={handleOpenEdit}
                    onSlotClick={(date, resourceId) => handleOpenCreate(date, resourceId)}
                    timeFormat={timeFormat}
                />
            </div>

            {/* Fab for mobile/desktop to quickly add */}
            <button
                onClick={() => handleOpenCreate()}
                className="absolute bottom-6 right-6 w-14 h-14 bg-brand-neon-cyan rounded-full flex items-center justify-center shadow-lg shadow-cyan-500/30 text-black hover:bg-white transition-colors z-50 md:hidden"
            >
                <span className="text-3xl font-light">+</span>
            </button>

            <AppointmentModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveAppointment}
                services={services}
                employees={employees}
                customers={customers}
                initialDate={selectedSlot?.date || currentDate}
                initialResource={selectedSlot?.resourceId}
                appointment={selectedAppointment}
            />
        </div>
    );
}
