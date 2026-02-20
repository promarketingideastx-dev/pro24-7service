import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { EmployeeService, EmployeeData } from '@/services/employee.service';
import { getTimeSlots, SLOT_HEIGHT, getTopOffset, TOTAL_HEIGHT } from './TimeGridHelpers';
import { Appointment } from '@/services/appointment.service';
import AppointmentItem from './AppointmentItem';
import { format, isSameDay } from 'date-fns';

interface ResourceViewProps {
    date: Date;
    appointments: Appointment[];
    onAppointmentClick?: (appointment: Appointment) => void;
    onSlotClick?: (date: Date, resourceId?: string) => void;
    timeFormat?: '12h' | '24h';
}

export default function ResourceView({ date, appointments, onAppointmentClick, onSlotClick, timeFormat = '12h' }: ResourceViewProps) {
    const { user } = useAuth();
    const [employees, setEmployees] = useState<EmployeeData[]>([]);
    const [loading, setLoading] = useState(true);
    const timeSlots = getTimeSlots(timeFormat);

    useEffect(() => {
        const fetchEmployees = async () => {
            if (!user) return;
            try {
                const data = await EmployeeService.getEmployees(user.uid);
                setEmployees(data.filter(e => e.active));
            } catch (error) {
                console.error("Error fetching employees:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchEmployees();
    }, [user]);

    if (loading) {
        return <div className="flex items-center justify-center h-full text-slate-500">Cargando equipo...</div>;
    }

    if (employees.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-slate-500">
                <p>No tienes empleados activos.</p>
                <p className="text-xs">Agrega miembros en la sección de Equipo.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-[#0F131F]">
            {/* Header Row */}
            <div className="flex border-b border-white/10 bg-[#1e3a5f]">
                <div className="w-16 flex-shrink-0 border-r border-white/10" />
                {/* Unassigned Column */}
                <div className="flex-1 flex flex-col items-center justify-center py-3 border-r border-white/10 min-w-[150px] bg-red-500/5">
                    <div className="text-sm font-bold text-red-400 truncate px-2">Sin Asignar</div>
                    <div className="text-[10px] text-red-400/60 truncate px-2">Pendientes</div>
                </div>
                {employees.map((emp) => (
                    <div key={emp.id} className="flex-1 flex flex-col items-center justify-center py-3 border-r border-white/10 last:border-r-0 min-w-[150px]">
                        <div className="text-sm font-bold text-white truncate px-2">{emp.name}</div>
                        <div className="text-[10px] text-slate-400 truncate px-2">{emp.role || 'Staff'}</div>
                    </div>
                ))}
            </div>

            {/* Grid Body */}
            <div className="flex-1 overflow-y-auto overflow-x-auto custom-scrollbar relative flex">
                {/* Time Labels Column */}
                <div className="w-16 flex-shrink-0 border-r border-white/10 bg-[#1e3a5f] sticky left-0 z-10">
                    {timeSlots.map((time, i) => (
                        <div
                            key={time}
                            className="border-b border-white/5 text-xs text-slate-500 flex items-start justify-end pr-2 pt-1"
                            style={{ height: SLOT_HEIGHT }}
                        >
                            {i % 2 === 0 ? time : ''}
                        </div>
                    ))}
                </div>

                {/* Unassigned Column Body */}
                <div
                    className="flex-1 relative border-r border-white/5 min-w-[150px] bg-red-500/5"
                    style={{ minHeight: TOTAL_HEIGHT }}
                >
                    {/* Slots */}
                    {timeSlots.map((time) => (
                        <div
                            key={time}
                            className="border-b border-white/5 absolute w-full hover:bg-white/5 transition-colors cursor-pointer"
                            style={{ top: getTopOffset(time), height: SLOT_HEIGHT }}
                            onClick={() => {
                                // Logic to create unassigned appointment if needed, or disable
                            }}
                        />
                    ))}

                    {/* Events */}
                    {appointments.filter(apt => isSameDay(apt.date.toDate(), date) && (apt.employeeId === 'pending' || !apt.employeeId)).map(apt => {
                        const aptDate = apt.date.toDate();
                        const top = getTopOffset(format(aptDate, 'HH:mm'));
                        const height = (apt.serviceDuration / 30) * SLOT_HEIGHT;

                        return (
                            <AppointmentItem
                                key={apt.id}
                                appointment={apt}
                                onClick={onAppointmentClick!}
                                style={{
                                    top: top,
                                    height: height,
                                    left: 2,
                                    right: 2,
                                }}
                            />
                        );
                    })}
                </div>

                {/* Employee Columns */}
                {employees.map((emp) => {
                    const empAppointments = appointments.filter(apt =>
                        isSameDay(apt.date.toDate(), date) && apt.employeeId === emp.id
                    );

                    return (
                        <div
                            key={emp.id}
                            className="flex-1 relative border-r border-white/5 last:border-r-0 min-w-[150px]"
                            style={{ minHeight: TOTAL_HEIGHT }}
                        >
                            {/* Slots */}
                            {timeSlots.map((time) => (
                                <div
                                    key={time}
                                    className="border-b border-white/5 absolute w-full hover:bg-white/5 transition-colors cursor-pointer"
                                    style={{ top: getTopOffset(time), height: SLOT_HEIGHT }}
                                    onClick={() => {
                                        if (onSlotClick) {
                                            let hours = 0;
                                            let minutes = 0;

                                            if (time.includes('M')) {
                                                const [t, p] = time.split(' ');
                                                const [h, m] = t.split(':').map(Number);
                                                minutes = m;
                                                if (p === 'PM' && h !== 12) hours = h + 12;
                                                else if (p === 'AM' && h === 12) hours = 0;
                                                else hours = h;
                                            } else {
                                                const [h, m] = time.split(':').map(Number);
                                                hours = h;
                                                minutes = m;
                                            }

                                            const slotDate = new Date(date);
                                            slotDate.setHours(hours, minutes, 0, 0);
                                            onSlotClick(slotDate, emp.id);
                                        }
                                    }}
                                />
                            ))}

                            {/* Events */}
                            {empAppointments.map(apt => {
                                const aptDate = apt.date.toDate();
                                const top = getTopOffset(format(aptDate, 'HH:mm'));
                                const height = (apt.serviceDuration / 30) * SLOT_HEIGHT;

                                return (
                                    <AppointmentItem
                                        key={apt.id}
                                        appointment={apt}
                                        onClick={onAppointmentClick!}
                                        style={{
                                            top: top,
                                            height: height,
                                            left: 2,
                                            right: 2,
                                        }}
                                    />
                                );
                            })}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
