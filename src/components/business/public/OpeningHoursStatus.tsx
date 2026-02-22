import { WeeklySchedule } from '@/services/employee.service';
import { isBusinessOpen, formatTime } from '@/lib/timeHelpers';
import { useTranslations } from 'next-intl';
import { Clock } from 'lucide-react';

interface OpeningHoursStatusProps {
    schedule?: WeeklySchedule;
    className?: string;
}

export default function OpeningHoursStatus({ schedule, className = '' }: OpeningHoursStatusProps) {
    const t = useTranslations('schedule');

    if (!schedule) {
        return (
            <div className={`flex items-center gap-2 text-slate-400 text-sm ${className}`}>
                <Clock className="w-4 h-4" />
                <span>{t('notAvailable')}</span>
            </div>
        );
    }

    const { isOpen, closesAt } = isBusinessOpen(schedule);

    // Build the status label in the active locale
    const statusLabel = isOpen && closesAt
        ? t('closesAt', { time: formatTime(closesAt) })
        : t('closedNow');

    return (
        <div className={`flex items-center gap-2 text-sm ${className}`}>
            <span className={`relative flex h-2.5 w-2.5`}>
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isOpen ? 'bg-green-400' : 'bg-red-400'}`}></span>
                <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isOpen ? 'bg-green-500' : 'bg-red-500'}`}></span>
            </span>
            <span className={`font-medium ${isOpen ? 'text-green-400' : 'text-red-400'}`}>
                {isOpen ? t('open') : t('closed')}
            </span>
            <span className="text-slate-500 text-xs">
                • {statusLabel}
            </span>
        </div>
    );
}
