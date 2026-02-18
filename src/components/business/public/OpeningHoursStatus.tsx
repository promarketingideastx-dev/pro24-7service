import { WeeklySchedule } from '@/services/employee.service';
import { isBusinessOpen } from '@/lib/timeHelpers';
import { Clock } from 'lucide-react';

interface OpeningHoursStatusProps {
    schedule?: WeeklySchedule;
    className?: string;
}

export default function OpeningHoursStatus({ schedule, className = '' }: OpeningHoursStatusProps) {
    if (!schedule) {
        return (
            <div className={`flex items-center gap-2 text-slate-400 text-sm ${className}`}>
                <Clock className="w-4 h-4" />
                <span>Horario no disponible</span>
            </div>
        );
    }

    const { isOpen, nextStatusLabel } = isBusinessOpen(schedule);

    return (
        <div className={`flex items-center gap-2 text-sm ${className}`}>
            <span className={`relative flex h-2.5 w-2.5`}>
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isOpen ? 'bg-green-400' : 'bg-red-400'}`}></span>
                <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isOpen ? 'bg-green-500' : 'bg-red-500'}`}></span>
            </span>
            <span className={`font-medium ${isOpen ? 'text-green-400' : 'text-red-400'}`}>
                {isOpen ? 'Abierto' : 'Cerrado'}
            </span>
            <span className="text-slate-500 text-xs">
                • {nextStatusLabel}
            </span>
        </div>
    );
}
