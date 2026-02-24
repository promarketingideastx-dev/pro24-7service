import { Appointment } from '@/services/appointment.service';
import { format } from 'date-fns';
import { Clock } from 'lucide-react';

interface AppointmentItemProps {
    appointment: Appointment;
    onClick: (appointment: Appointment) => void;
    style?: React.CSSProperties;
}

const statusColors: Record<string, string> = {
    confirmed: 'bg-green-50 border-green-300 text-green-800',
    pending: 'bg-amber-50 border-amber-300 text-amber-800',
    cancelled: 'bg-red-50 border-red-200 text-red-500 opacity-60',
    completed: 'bg-slate-100 border-slate-300 text-slate-600',
    'no-show': 'bg-slate-50 border-slate-200 text-slate-400 opacity-50',
};


export default function AppointmentItem({ appointment, onClick, style }: AppointmentItemProps) {
    const colorClass = statusColors[appointment.status] || statusColors.confirmed;

    return (
        <div
            onClick={(e) => {
                e.stopPropagation();
                onClick(appointment);
            }}
            className={`absolute z-10 p-1.5 rounded-md border text-xs cursor-pointer hover:brightness-110 transition-all flex flex-col overflow-hidden ${colorClass}`}
            style={style}
        >
            <div className="font-bold truncate leading-tight">
                {appointment.customerName}
            </div>
            <div className="truncate opacity-80 text-[10px]">
                {appointment.serviceName}
            </div>
            <div className="flex items-center gap-1 mt-auto opacity-70 text-[9px]">
                <Clock size={8} />
                <span>{format(appointment.date.toDate(), 'HH:mm')}</span>
            </div>
        </div>
    );
}
