import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Users } from 'lucide-react';
import { format } from 'date-fns';
import { es, enUS, ptBR } from 'date-fns/locale';
import { useLocale, useTranslations } from 'next-intl';

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
    const locale = useLocale();
    const t = useTranslations('business.agenda');
    const dateFnsLocale = locale === 'en' ? enUS : locale === 'pt-BR' ? ptBR : es;
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
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-200 backdrop-blur-md">

            {/* Left: Date Navigation */}
            <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-start">
                <div className="flex items-center gap-1 bg-black/20 rounded-lg p-1">
                    <button
                        onClick={handlePrev}
                        className="p-2 hover:bg-slate-100 rounded-md text-slate-300 hover:text-slate-800 transition-colors"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <button
                        onClick={onToday}
                        className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-slate-800 transition-colors"
                    >
                        {t('today')}
                    </button>
                    <button
                        onClick={handleNext}
                        className="p-2 hover:bg-slate-100 rounded-md text-slate-300 hover:text-slate-800 transition-colors"
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>

                <h2 className="text-xl font-bold text-white capitalize">
                    {format(currentDate, 'MMMM yyyy', { locale: dateFnsLocale })}
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
                    {t('viewDay')}
                </button>
                <button
                    onClick={() => onViewChange('week')}
                    className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-sm font-medium transition-all ${view === 'week'
                        ? 'bg-brand-neon-cyan text-black shadow-[0_0_15px_rgba(0,240,255,0.3)]'
                        : 'text-slate-400 hover:text-slate-200'
                        }`}
                >
                    {t('viewWeek')}
                </button>
                <button
                    onClick={() => onViewChange('resource')}
                    className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${view === 'resource'
                        ? 'bg-brand-neon-cyan text-black shadow-[0_0_15px_rgba(0,240,255,0.3)]'
                        : 'text-slate-400 hover:text-slate-200'
                        }`}
                >
                    <Users size={14} />
                    {t('viewTeam')}
                </button>
            </div>
        </div>
    );
}
