import ProviderBookingsView from '@/components/bookings/ProviderBookingsView';
import { Suspense } from 'react';

import { useTranslations } from 'next-intl';

export default function ProviderBookingsPage() {
    const tStates = useTranslations('common.states');
    return (
        <Suspense fallback={<div className="p-8 text-center text-slate-500">{tStates('loadingBookings')}</div>}>
            <ProviderBookingsView />
        </Suspense>
    );
}
