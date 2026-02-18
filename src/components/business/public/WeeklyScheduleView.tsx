import { WeeklySchedule } from '@/services/employee.service';
import { getDayLabel } from '@/lib/timeHelpers';
import { Clock } from 'lucide-react';

interface WeeklyScheduleViewProps {
    schedule?: WeeklySchedule;
}

export default function WeeklyScheduleView({ schedule }: WeeklyScheduleViewProps) {
    if (!schedule) return null;

    const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    const todayIndex = new Date().getDay(); // 0 = Sun, 1 = Mon...
    // Adjust to match our array where 0=mon, 6=sun for highlighting if needed, 
    // but getDay() returns 0 for Sunday.
    // Let's just highlight based on label matching current day.

    const todayKey = days[todayIndex === 0 ? 6 : todayIndex - 1]; // Convert Sun(0) to index 6

    return (
        <div className="bg-white/5 rounded-xl p-4 border border-white/5 space-y-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2 mb-2">
                <Clock className="w-3.5 h-3.5" />
                Horario de Atención
            </h3>
            <div className="space-y-2">
                {days.map((dayKey) => {
                    const daySchedule = schedule[dayKey as keyof WeeklySchedule];
                    const isToday = dayKey === todayKey;

                    return (
                        <div key={dayKey} className={`flex justify-between items-center text-sm ${isToday ? 'text-white font-medium bg-white/5 -mx-2 px-2 py-1 rounded' : 'text-slate-400'}`}>
                            <span>{getDayLabel(dayKey)}</span>
                            <span>
                                {daySchedule?.enabled
                                    ? `${daySchedule.start} - ${daySchedule.end}`
                                    : 'Cerrado'}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
