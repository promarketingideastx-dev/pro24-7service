import { BookingDocument } from '@/types/firestore-schema';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, isToday } from 'date-fns';
import { es, enUS, ptBR } from 'date-fns/locale';
import { useLocale } from 'next-intl';

interface MonthViewProps {
    date: Date;
    appointments: BookingDocument[];
    onAppointmentClick?: (appointment: BookingDocument) => void;
    onSlotClick?: (date: Date) => void;
}

export default function MonthView({ date, appointments, onAppointmentClick, onSlotClick }: MonthViewProps) {
    const locale = useLocale();
    const dateLocale = locale === 'en' ? enUS : locale === 'pt-BR' ? ptBR : es;

    const monthStart = startOfMonth(date);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const dateFormat = "d";
    const days = eachDayOfInterval({ start: startDate, end: endDate });

    const weekDays = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

    return (
        <div className="flex flex-col h-full bg-white relative">
            <div className="grid grid-cols-7 border-b border-slate-200 sticky top-0 bg-white z-20">
                {weekDays.map(day => (
                    <div key={day} className="py-2 text-center text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50 border-r border-slate-200 last:border-r-0">
                        {day.substring(0, 3)}
                    </div>
                ))}
            </div>
            {/* The rows dynamically size to fill space. 5 or 6 weeks depending on the month */}
            <div className="flex-1 grid grid-cols-7 overflow-y-auto" style={{ gridTemplateRows: `repeat(${days.length / 7}, minmax(100px, 1fr))` }}>
                {days.map((day, idx) => {
                    const dayBookings = appointments.filter(apt => {
                        const aptDate = new Date(apt.date + 'T' + (apt.time || '00:00'));
                        return isSameDay(aptDate, day) && (apt.status === 'confirmed' || apt.status === 'completed'); 
                    }).sort((a, b) => new Date(a.date + 'T' + a.time).getTime() - new Date(b.date + 'T' + b.time).getTime());

                    return (
                        <div
                            key={day.toString()}
                            className={`border-b border-r border-slate-200 p-1 flex flex-col transition-colors cursor-pointer hover:bg-slate-50
                                ${!isSameMonth(day, monthStart) ? 'bg-slate-50/50' : 'bg-white'}
                            `}
                            onClick={() => onSlotClick?.(day)}
                        >
                            <div className="flex justify-end mb-1 px-1 mt-1">
                                <span className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full
                                    ${isToday(day) ? 'bg-[#14B8A6] text-white shadow-sm' : 
                                      !isSameMonth(day, monthStart) ? 'text-slate-400' : 'text-slate-700'}`}>
                                    {format(day, dateFormat)}
                                </span>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto space-y-1 no-scrollbar pb-1 px-0.5" style={{ maxHeight: '120px' }}>
                                {dayBookings.map((apt, i) => (
                                    <div
                                        key={apt.id || i}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onAppointmentClick?.(apt);
                                        }}
                                        className={`text-[10px] sm:text-xs truncate px-1.5 py-0.5 rounded border font-semibold transition-colors
                                            ${apt.status === 'confirmed' ? 'bg-[#14B8A6]/10 text-[#0F766E] border-[#14B8A6]/20 hover:bg-[#14B8A6]/20' : 
                                              apt.status === 'completed' ? 'bg-blue-50 text-blue-700 border-blue-200' : 
                                              'bg-amber-50 text-amber-700 border-amber-200'}
                                        `}
                                    >
                                        <span className="opacity-80 mr-1 font-normal">{format(new Date(apt.date + 'T' + apt.time), 'HH:mm')}</span>
                                        {apt.clientName || 'Cliente'}
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
