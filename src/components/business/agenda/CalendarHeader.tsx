import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Users } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export type CalendarView = 'day' | 'week' | 'resource';

interface CalendarHeaderProps {
    currentDate: Date;
    view: CalendarView;
    onViewChange: (view: CalendarView) => void;
    onDateChange: (date: Date) => void;
    onToday: () => void;
}

export default function CalendarHeader({
    currentDate,
    view,
    onViewChange,
    onDateChange,
    onToday
}: CalendarHeaderProps) {
    const handlePrev = () => {
        const newDate = new Date(currentDate);
        if (view === 'week') newDate.setDate(newDate.getDate() - 7);
        else newDate.setDate(newDate.getDate() - 1);
        onDateChange(newDate);
    };

    const handleNext = () => {
        const newDate = new Date(currentDate);
        if (view === 'week') newDate.setDate(newDate.getDate() + 7);
        else newDate.setDate(newDate.getDate() + 1);
        onDateChange(newDate);
    };

    return (
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6 bg-white/5 p-4 rounded-2xl border border-white/10 backdrop-blur-md">

            {/* Left: Date Navigation */}
            <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-start">
                <div className="flex items-center gap-1 bg-black/20 rounded-lg p-1">
                    <button
                        onClick={handlePrev}
                        className="p-2 hover:bg-white/10 rounded-md text-slate-300 hover:text-white transition-colors"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <button
                        onClick={onToday}
                        className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-white transition-colors"
                    >
                        Hoy
                    </button>
                    <button
                        onClick={handleNext}
                        className="p-2 hover:bg-white/10 rounded-md text-slate-300 hover:text-white transition-colors"
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>

                <h2 className="text-xl font-bold text-white capitalize">
                    {format(currentDate, 'MMMM yyyy', { locale: es })}
                </h2>
            </div>

            {/* Right: View Switcher */}
            <div className="flex bg-black/20 p-1 rounded-xl w-full md:w-auto">
                <button
                    onClick={() => onViewChange('day')}
                    className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-sm font-medium transition-all ${view === 'day'
                            ? 'bg-brand-neon-cyan text-black shadow-[0_0_15px_rgba(0,240,255,0.3)]'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                >
                    Día
                </button>
                <button
                    onClick={() => onViewChange('week')}
                    className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-sm font-medium transition-all ${view === 'week'
                            ? 'bg-brand-neon-cyan text-black shadow-[0_0_15px_rgba(0,240,255,0.3)]'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                >
                    Semana
                </button>
                <button
                    onClick={() => onViewChange('resource')}
                    className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${view === 'resource'
                            ? 'bg-brand-neon-cyan text-black shadow-[0_0_15px_rgba(0,240,255,0.3)]'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                >
                    <Users size={14} />
                    Equipo
                </button>
            </div>
        </div>
    );
}
