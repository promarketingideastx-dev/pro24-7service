

export const getTimeSlots = (format: '12h' | '24h' = '12h') => {
    return Array.from({ length: 24 * 2 }, (_, i) => {
        const hour = Math.floor(i / 2);
        const minute = i % 2 === 0 ? '00' : '30';

        if (format === '24h') {
            return `${hour.toString().padStart(2, '0')}:${minute}`;
        } else {
            const period = hour >= 12 ? 'PM' : 'AM';
            const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
            return `${displayHour}:${minute} ${period}`;
        }
    });
};

// Helper to get time string from date for grid positioning comparison
// Returns 24h format HH:mm always for internal logic
export const getInternalTime = (date: Date) => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
};

export const formatTimeDisplay = (date: Date, format: '12h' | '24h' = '12h') => {
    const hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');

    if (format === '24h') {
        return `${hours.toString().padStart(2, '0')}:${minutes}`;
    } else {
        const period = hours >= 12 ? 'PM' : 'AM';
        const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
        return `${displayHour}:${minutes} ${period}`;
    }
};

export const getTopOffset = (timeLabel: string) => {
    // Helper to parse "HH:mm" or "H:mm AM/PM" back to minutes for positioning
    let hours = 0;
    let minutes = 0;

    if (timeLabel.includes('M')) { // 12h format (AM/PM)
        const [time, period] = timeLabel.split(' ');
        const [h, m] = time.split(':').map(Number);
        minutes = m;
        if (period === 'PM' && h !== 12) hours = h + 12;
        else if (period === 'AM' && h === 12) hours = 0;
        else hours = h;
    } else { // 24h format
        const [h, m] = timeLabel.split(':').map(Number);
        hours = h;
        minutes = m;
    }

    return (hours * HOUR_HEIGHT) + (minutes / 60 * HOUR_HEIGHT);
};

export const SLOT_HEIGHT = 40; // 30 mins height
export const HOUR_HEIGHT = SLOT_HEIGHT * 2;
export const TOTAL_HEIGHT = SLOT_HEIGHT * 48; // Total height for 24h // px
