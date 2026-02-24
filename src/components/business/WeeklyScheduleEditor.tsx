import { useState, useEffect } from 'react';
import { X, Clock, Copy, Save } from 'lucide-react';
import { toast } from 'sonner';
import { WeeklySchedule } from '@/services/employee.service';

interface WeeklyScheduleEditorProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (schedule: WeeklySchedule) => Promise<void>;
    initialSchedule?: WeeklySchedule;
    title?: string;
    subtitle?: string;
    entityName?: string;
    saveLabel?: string;
}

const DEFAULT_SCHEDULE: WeeklySchedule = {
    mon: { enabled: true, start: '09:00', end: '17:00' },
    tue: { enabled: true, start: '09:00', end: '17:00' },
    wed: { enabled: true, start: '09:00', end: '17:00' },
    thu: { enabled: true, start: '09:00', end: '17:00' },
    fri: { enabled: true, start: '09:00', end: '17:00' },
    sat: { enabled: false, start: '10:00', end: '14:00' },
    sun: { enabled: false, start: '10:00', end: '14:00' }
};

export default function WeeklyScheduleEditor({
    isOpen,
    onClose,
    onSave,
    initialSchedule,
    title = "Horario de Trabajo",
    subtitle = "Configura la disponibilidad semanal",
    entityName,
    saveLabel = "Guardar Horario"
}: WeeklyScheduleEditorProps) {
    const [schedule, setSchedule] = useState<WeeklySchedule>(DEFAULT_SCHEDULE);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setSchedule(initialSchedule || DEFAULT_SCHEDULE);
        }
    }, [isOpen, initialSchedule]);

    if (!isOpen) return null;

    const handleCopyMondayToAll = () => {
        const monday = schedule.mon;
        setSchedule({
            mon: monday,
            tue: { ...monday },
            wed: { ...monday },
            thu: { ...monday },
            fri: { ...monday },
            sat: { ...monday, enabled: false }, // Usually distinct
            sun: { ...monday, enabled: false }
        });
        toast.success("Horario de Lunes copiado (Sáb/Dom desactivados por defecto)");
    };

    const handleSave = async () => {
        // Validation: Start < End
        const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
        for (const day of days) {
            const s = schedule[day];
            if (s.enabled && s.start >= s.end) {
                toast.error(`Error en ${day.toUpperCase()}: Hora inicio debe ser menor a fin.`);
                return;
            }
        }

        setIsSubmitting(true);
        try {
            await onSave(schedule);
        } catch (error) {
            console.error("Error in editor save:", error);
            // Toast handled by parent or here? Let's leave it to parent mostly, but we can have generic error
        } finally {
            setIsSubmitting(false);
        }
    };

    const dayLabels: Record<string, string> = { mon: 'Lunes', tue: 'Martes', wed: 'Miércoles', thu: 'Jueves', fri: 'Viernes', sat: 'Sábado', sun: 'Domingo' };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white border border-slate-200 w-full max-w-2xl rounded-2xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-slate-500 hover:text-slate-800"
                >
                    <X size={20} />
                </button>

                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                            <Clock className="text-[#14B8A6]" />
                            {title}
                        </h2>
                        <p className="text-slate-500 text-sm">
                            {subtitle} {entityName && <span className="text-slate-800 font-bold">{entityName}</span>}
                        </p>
                    </div>
                    <button
                        onClick={handleCopyMondayToAll}
                        className="text-xs flex items-center gap-1 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-800 transition-colors border border-slate-200"
                    >
                        <Copy size={12} />
                        Copiar Lunes a todos
                    </button>
                </div>

                <div className="space-y-1">
                    {(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const).map(day => {
                        const isEnabled = schedule[day].enabled;

                        return (
                            <div key={day} className={`flex items-center gap-4 p-3 rounded-xl border ${isEnabled ? 'bg-slate-50 border-slate-200' : 'bg-transparent border-transparent opacity-60'} transition-all`}>
                                <div className="w-24 font-medium text-slate-700">{dayLabels[day]}</div>

                                <div
                                    onClick={() => setSchedule({ ...schedule, [day]: { ...schedule[day], enabled: !isEnabled } })}
                                    className={`w-10 h-6 rounded-full relative cursor-pointer transition-colors ${isEnabled ? 'bg-[#14B8A6]' : 'bg-slate-200'}`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${isEnabled ? 'left-5' : 'left-1'}`} />
                                </div>

                                <div className="flex items-center gap-2 flex-1">
                                    <input
                                        type="time"
                                        value={schedule[day].start}
                                        disabled={!isEnabled}
                                        onChange={e => setSchedule({ ...schedule, [day]: { ...schedule[day], start: e.target.value } })}
                                        className="bg-white border border-slate-200 rounded px-2 py-1 text-slate-900 text-sm focus:border-[#14B8A6] focus:outline-none disabled:opacity-30"
                                    />
                                    <span className="text-slate-500">-</span>
                                    <input
                                        type="time"
                                        value={schedule[day].end}
                                        disabled={!isEnabled}
                                        onChange={e => setSchedule({ ...schedule, [day]: { ...schedule[day], end: e.target.value } })}
                                        className="bg-white border border-slate-200 rounded px-2 py-1 text-slate-900 text-sm focus:border-[#14B8A6] focus:outline-none disabled:opacity-30"
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-slate-200">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-slate-400 hover:text-slate-800 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSubmitting}
                        className="px-6 py-2 bg-[#14B8A6] hover:bg-[#0F9488] text-white font-bold rounded-xl shadow-[0_4px_14px_rgba(20,184,166,0.30)] transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                        {isSubmitting ? (
                            'Guardando...'
                        ) : (
                            <>
                                <Save size={18} />
                                {saveLabel}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
