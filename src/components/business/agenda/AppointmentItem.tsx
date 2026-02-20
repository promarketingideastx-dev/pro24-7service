import { Appointment } from '@/services/appointment.service';
import { format } from 'date-fns';
import { Clock } from 'lucide-react';

interface AppointmentItemProps {
    appointment: Appointment;
    onClick: (appointment: Appointment) => void;
    style?: React.CSSProperties;
}

const statusColors: Record<string, string> = {
    confirmed: 'bg-green-500/20 border-green-500/50 text-green-200',
    pending: 'bg-yellow-500/20 border-yellow-500/50 text-yellow-200',
    cancelled: 'bg-red-500/10 border-red-500/30 text-red-300 opacity-60',
    completed: 'bg-slate-500/20 border-slate-500/40 text-slate-300',
    'no-show': 'bg-slate-600/10 border-slate-600/30 text-slate-400 opacity-50',
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
