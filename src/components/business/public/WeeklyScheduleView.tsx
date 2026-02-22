import { WeeklySchedule } from '@/services/employee.service';
import { getDayLabel, formatTime } from '@/lib/timeHelpers';
import { useTranslations } from 'next-intl';
import { Clock } from 'lucide-react';

interface WeeklyScheduleViewProps {
    schedule?: WeeklySchedule;
}

export default function WeeklyScheduleView({ schedule }: WeeklyScheduleViewProps) {
    const t = useTranslations('schedule');
    if (!schedule) return null;

    const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    const todayIndex = new Date().getDay();
    const todayKey = days[todayIndex === 0 ? 6 : todayIndex - 1];

    // Day labels from translations — reactive to locale changes
    const dayLabels: Record<string, string> = {
        mon: t('days.mon'),
        tue: t('days.tue'),
        wed: t('days.wed'),
        thu: t('days.thu'),
        fri: t('days.fri'),
        sat: t('days.sat'),
        sun: t('days.sun'),
    };

    return (
        <div className="bg-white/5 rounded-xl p-4 border border-white/5 space-y-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2 mb-2">
                <Clock className="w-3.5 h-3.5" />
                {t('businessHours')}
            </h3>
            <div className="space-y-2">
                {days.map((dayKey) => {
                    const daySchedule = schedule[dayKey as keyof WeeklySchedule];
                    const isToday = dayKey === todayKey;

                    return (
                        <div key={dayKey} className={`flex justify-between items-center text-sm ${isToday ? 'text-white font-medium bg-white/5 -mx-2 px-2 py-1 rounded' : 'text-slate-400'}`}>
                            <span>{getDayLabel(dayKey, dayLabels)}</span>
                            <span>
                                {daySchedule?.enabled
                                    ? `${formatTime(daySchedule.start)} - ${formatTime(daySchedule.end)}`
                                    : t('closed')}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
