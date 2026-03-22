'use client';

import { useEffect, useState } from 'react';
import { BookingService } from '@/services/booking.service';
import { BookingDocument } from '@/types/firestore-schema';
import { CalendarCheck } from 'lucide-react';
import { formatPrice } from '@/lib/currencyUtils';

export default function AdminBookingsView() {
    const [bookings, setBookings] = useState<BookingDocument[]>([]);
    const [loading, setLoading] = useState(true);

    const loadBookings = async () => {
        setLoading(true);
        try {
            const data = await BookingService.getAll();
            setBookings(data);
        } catch (error) {
            console.error("Error loading bookings:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadBookings();
    }, []);

    if (loading) {
        return <div className="p-8 text-center text-slate-500">Cargando todas las citas del sistema...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                    <CalendarCheck className="text-[#14B8A6]" />
                    Bookings (Global)
                </h1>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="p-4 font-semibold text-slate-600">ID</th>
                                <th className="p-4 font-semibold text-slate-600">Negocio</th>
                                <th className="p-4 font-semibold text-slate-600">Servicio</th>
                                <th className="p-4 font-semibold text-slate-600">Fecha</th>
                                <th className="p-4 font-semibold text-slate-600">Cliente UID</th>
                                <th className="p-4 font-semibold text-slate-600">Monto</th>
                                <th className="p-4 font-semibold text-slate-600">Estado</th>
                            </tr>
                        </thead>
                        <tbody>
                            {bookings.map((b) => (
                                <tr key={b.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                    <td className="p-4 text-xs font-mono text-slate-500">{b.id?.slice(0, 8)}...</td>
                                    <td className="p-4 font-medium text-slate-900">{b.businessId.slice(0, 8)}</td>
                                    <td className="p-4 text-slate-600">{b.serviceName}</td>
                                    <td className="p-4 text-slate-600 whitespace-nowrap">{b.date} {b.time}</td>
                                    <td className="p-4 text-slate-600 cursor-pointer hover:text-blue-600" title={b.clientId}>
                                        {b.clientId.slice(0, 8)}...
                                    </td>
                                    <td className="p-4 text-slate-600 font-mono text-sm">
                                        {formatPrice(b.totalAmount || 0, b.currency)}
                                    </td>
                                    <td className="p-4">
                                        <span className={`text-xs px-2 py-1 rounded-full font-bold uppercase tracking-wider
                                            ${b.status === 'pending' ? 'bg-amber-100 text-amber-700' : ''}
                                            ${b.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' : ''}
                                            ${b.status === 'canceled' ? 'bg-red-100 text-red-700' : ''}
                                            ${b.status === 'completed' ? 'bg-blue-100 text-blue-700' : ''}
                                        `}>
                                            {b.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {bookings.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="p-8 text-center text-slate-500">
                                        No se encontraron citas en el sistema.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
