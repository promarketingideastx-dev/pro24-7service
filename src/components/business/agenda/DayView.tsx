import { format, isSameDay } from 'date-fns';
import { getTimeSlots, formatTimeDisplay, SLOT_HEIGHT, getTopOffset, TOTAL_HEIGHT } from './TimeGridHelpers';
import { Appointment } from '@/services/appointment.service';
import AppointmentItem from './AppointmentItem';

interface DayViewProps {
    date: Date;
    appointments: Appointment[];
    onAppointmentClick?: (appointment: Appointment) => void;
    onSlotClick?: (date: Date) => void;
    timeFormat?: '12h' | '24h';
}

export default function DayView({ date, appointments, onAppointmentClick, onSlotClick, timeFormat = '12h' }: DayViewProps) {
    const dayAppointments = appointments.filter(apt => isSameDay(apt.date.toDate(), date));
    const timeSlots = getTimeSlots(timeFormat);

    return (
        <div className="flex h-full overflow-y-auto custom-scrollbar relative bg-[#0F131F]">
            {/* Time Labels Column */}
            <div className="w-16 flex-shrink-0 border-r border-white/10 bg-[#151b2e] sticky left-0 z-10">
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

            {/* Content Column */}
            <div className="flex-1 relative min-w-[300px]" style={{ minHeight: TOTAL_HEIGHT }}>
                {/* Horizontal Grid Lines */}
                {timeSlots.map((time) => (
                    <div
                        key={time}
                        className="border-b border-white/5 absolute w-full hover:bg-white/5 transition-colors cursor-pointer"
                        style={{ top: getTopOffset(time), height: SLOT_HEIGHT }}
                        onClick={() => {
                            if (onSlotClick) {
                                // Parse time string
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
                                onSlotClick(slotDate);
                            }
                        }}
                    />
                ))}

                {/* Current Time Indicator (mock) */}
                <div
                    className="absolute w-full border-t-2 border-red-500 z-20 pointer-events-none"
                    style={{ top: getTopOffset(formatTimeDisplay(new Date(), '24h')) }} // Use helper for consistency
                >
                    <div className="absolute -left-2 -top-1.5 w-3 h-3 rounded-full bg-red-500" />
                </div>

                {/* Events */}
                {dayAppointments.map(apt => {
                    const aptDate = apt.date.toDate();
                    const top = getTopOffset(format(aptDate, 'HH:mm')); // 24h format for internal logic matches getTopOffset's regex fallback? No, getTopOffset checks for 'M'. 24h string works.
                    const height = (apt.serviceDuration / 30) * SLOT_HEIGHT;

                    return (
                        <AppointmentItem
                            key={apt.id}
                            appointment={apt}
                            onClick={onAppointmentClick!}
                            style={{
                                top: top,
                                height: height,
                                left: 4,
                                right: 10,
                            }}
                        />
                    );
                })}
            </div>
        </div>
    );
}
