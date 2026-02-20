import { format, startOfWeek, addDays, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { getTimeSlots, SLOT_HEIGHT, getTopOffset, TOTAL_HEIGHT } from './TimeGridHelpers';
import { Appointment } from '@/services/appointment.service';
import AppointmentItem from './AppointmentItem';

interface WeekViewProps {
    date: Date;
    appointments: Appointment[];
    onAppointmentClick?: (appointment: Appointment) => void;
    onSlotClick?: (date: Date) => void;
    timeFormat?: '12h' | '24h';
}

export default function WeekView({ date, appointments, onAppointmentClick, onSlotClick, timeFormat = '12h' }: WeekViewProps) {
    const startDate = startOfWeek(date, { weekStartsOn: 1 });
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(startDate, i));
    const timeSlots = getTimeSlots(timeFormat);

    return (
        <div className="flex flex-col h-full bg-[#0F131F]">
            {/* Header Row */}
            <div className="flex border-b border-white/10 bg-[#1e5555]">
                <div className="w-16 flex-shrink-0 border-r border-white/10" />
                {weekDays.map((day, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center justify-center py-2 border-r border-white/10 last:border-r-0">
                        <span className="text-xs text-slate-400 uppercase">{format(day, 'EEE', { locale: es })}</span>
                        <div className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold mt-1 ${format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
                            ? 'bg-brand-neon-cyan text-black'
                            : 'text-white'
                            }`}>
                            {format(day, 'd')}
                        </div>
                    </div>
                ))}
            </div>

            {/* Grid Body */}
            <div className="flex-1 overflow-y-auto overflow-x-auto custom-scrollbar relative flex">
                {/* Time Labels Column */}
                <div className="w-16 flex-shrink-0 border-r border-white/10 bg-[#1e5555] sticky left-0 z-10">
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

                {/* Day Columns */}
                {weekDays.map((day, i) => {
                    const dayAppointments = appointments.filter(apt => isSameDay(apt.date.toDate(), day));

                    return (
                        <div
                            key={i}
                            className="flex-1 relative border-r border-white/5 last:border-r-0 min-w-[100px]"
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

                                            const slotDate = new Date(day);
                                            slotDate.setHours(hours, minutes, 0, 0);
                                            onSlotClick(slotDate);
                                        }
                                    }}
                                />
                            ))}

                            {/* Events */}
                            {dayAppointments.map(apt => {
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
