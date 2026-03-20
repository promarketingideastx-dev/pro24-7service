import { CalendarView } from './CalendarHeader';
import DayView from './DayView';
import WeekView from './WeekView';
import ResourceView from './ResourceView';
import MonthView from './MonthView';
import { BookingDocument } from '@/types/firestore-schema';

interface CalendarGridProps {
    date: Date;
    view: CalendarView;
    appointments?: BookingDocument[];
    onAppointmentClick?: (appointment: BookingDocument) => void;
    onSlotClick?: (date: Date, resourceId?: string) => void;
    timeFormat?: '12h' | '24h';
}

export default function CalendarGrid({
    date,
    view,
    appointments = [],
    onAppointmentClick,
    onSlotClick,
    timeFormat = '12h'
}: CalendarGridProps) {
    switch (view) {
        case 'day':
            return <DayView date={date} appointments={appointments} onAppointmentClick={onAppointmentClick} onSlotClick={onSlotClick} timeFormat={timeFormat} />;
        case 'week':
            return <WeekView date={date} appointments={appointments} onAppointmentClick={onAppointmentClick} onSlotClick={onSlotClick} timeFormat={timeFormat} />;
        case 'month':
            return <MonthView date={date} appointments={appointments} onAppointmentClick={onAppointmentClick} onSlotClick={onSlotClick} />;
        case 'resource':
            return <ResourceView date={date} appointments={appointments} onAppointmentClick={onAppointmentClick} onSlotClick={onSlotClick} timeFormat={timeFormat} />;
        default:
            return <ResourceView date={date} appointments={appointments} onAppointmentClick={onAppointmentClick} onSlotClick={onSlotClick} timeFormat={timeFormat} />;
    }
}
