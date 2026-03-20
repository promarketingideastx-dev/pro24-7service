import ProviderBookingsView from '@/components/bookings/ProviderBookingsView';
import { Suspense } from 'react';

export default function ProviderBookingsPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center text-slate-500">Cargando citas...</div>}>
            <ProviderBookingsView />
        </Suspense>
    );
}
