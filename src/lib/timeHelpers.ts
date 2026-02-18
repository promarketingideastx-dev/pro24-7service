
import { WeeklySchedule } from '@/services/employee.service';

/**
 * Parses a time string "HH:mm" into minutes from midnight.
 */
export const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
};

/**
 * Formats minutes from midnight into "HH:mm" string.
 */
export const minutesToTime = (minutes: number): string => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

/**
 * Checks if the business is currently open.
 */
export const isBusinessOpen = (schedule?: WeeklySchedule): { isOpen: boolean; nextStatusTime?: string; nextStatusLabel?: string } => {
    if (!schedule) return { isOpen: false, nextStatusLabel: 'Horario no disponible' };

    const now = new Date();
    // Get day of week: 0 (Sun) - 6 (Sat)
    // Map to our keys: mon, tue, wed, thu, fri, sat, sun
    const daysMap = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const currentDayKey = daysMap[now.getDay()] as keyof WeeklySchedule;
    const currentDaySchedule = schedule[currentDayKey];

    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    if (currentDaySchedule && currentDaySchedule.enabled) {
        const startMinutes = timeToMinutes(currentDaySchedule.start);
        const endMinutes = timeToMinutes(currentDaySchedule.end);

        if (currentMinutes >= startMinutes && currentMinutes < endMinutes) {
            return {
                isOpen: true,
                nextStatusTime: currentDaySchedule.end,
                nextStatusLabel: `Cierra a las ${currentDaySchedule.end}`
            };
        }
    }

    // Use simple logic for now: "Closed"
    // TODO: Calculate next opening time (requires looping through next days)
    return { isOpen: false, nextStatusLabel: 'Cerrado ahora' };
};

/**
 * Formats the day name key to Spanish label
 */
export const getDayLabel = (key: string): string => {
    const labels: Record<string, string> = {
        mon: 'Lunes',
        tue: 'Martes',
        wed: 'Miércoles',
        thu: 'Jueves',
        fri: 'Viernes',
        sat: 'Sábado',
        sun: 'Domingo'
    };
    return labels[key] || key;
};
