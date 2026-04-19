'use client';

import { useEffect, useState } from 'react';
import { BookingService } from '@/services/booking.service';
import { BookingDocument } from '@/types/firestore-schema';
import { CalendarCheck, Trash2, CheckSquare } from 'lucide-react';
import { formatPrice } from '@/lib/currencyUtils';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

export default function AdminBookingsView() {
    const tStates = useTranslations('common.states');
    const [bookings, setBookings] = useState<BookingDocument[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Selection state
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isDeleting, setIsDeleting] = useState(false);

    // Dictionaries for Real Names
    const [businessNames, setBusinessNames] = useState<Record<string, string>>({});
    const [clientNames, setClientNames] = useState<Record<string, string>>({});

    const resolveNames = async (docs: BookingDocument[]) => {
        const uniqueBizIds = Array.from(new Set(docs.map(b => b.businessId).filter(Boolean)));
        const uniqueClientIds = Array.from(new Set(docs.map(b => b.clientId).filter(Boolean)));

        const newBizNames: Record<string, string> = { ...businessNames };
        const newClientNames: Record<string, string> = { ...clientNames };

        // Fetch missing businesses
        const missingBizIds = uniqueBizIds.filter(id => !newBizNames[id]);
        await Promise.all(missingBizIds.map(async (id) => {
            try {
                const snap = await getDoc(doc(db, 'businesses_public', id));
                if (snap.exists()) {
                    newBizNames[id] = snap.data().name || id;
                } else {
                    newBizNames[id] = 'N/A';
                }
            } catch { newBizNames[id] = 'Error'; }
        }));

        // Fetch missing clients
        const missingClientIds = uniqueClientIds.filter(id => !newClientNames[id]);
        await Promise.all(missingClientIds.map(async (id) => {
            try {
                const snap = await getDoc(doc(db, 'users', id));
                if (snap.exists()) {
                    newClientNames[id] = snap.data().displayName || snap.data().email || id;
                } else {
                    newClientNames[id] = 'N/A';
                }
            } catch { newClientNames[id] = 'Error'; }
        }));

        setBusinessNames(newBizNames);
        setClientNames(newClientNames);
    };

    const loadBookings = async () => {
        setLoading(true);
        try {
            const data = await BookingService.getAll();
            setBookings(data);
            setSelectedIds([]); // reset selections on reload
            await resolveNames(data);
        } catch (error) {
            console.error("Error loading bookings:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadBookings();
    }, []);

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedIds(bookings.map(b => b.id));
        } else {
            setSelectedIds([]);
        }
    };

    const handleSelect = (id: string) => {
        setSelectedIds(prev => 
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const handleDeleteSelected = async () => {
        if (selectedIds.length === 0) return;
        
        const confirm = window.confirm(`Estás a punto de borrar definitivamente ${selectedIds.length} cita(s) del mundo. Esta acción NO se puede deshacer. ¿Continuar?`);
        if (!confirm) return;

        setIsDeleting(true);
        try {
            await BookingService.deleteBookings(selectedIds);
            toast.success(tStates('successDeleted'));
            await loadBookings();
        } catch (error) {
            console.error("Error deleting bookings:", error);
            toast.error(tStates('errorDeleting'));
        } finally {
            setIsDeleting(false);
        }
    };

    if (loading && bookings.length === 0) {
        return <div className="p-8 text-center text-slate-500">{tStates('loadingSystem')}</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
                <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                    <CalendarCheck className="text-[#14B8A6]" />
                    Bookings (Global)
                </h1>
                
                {selectedIds.length > 0 && (
                    <button
                        onClick={handleDeleteSelected}
                        disabled={isDeleting}
                        className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 transition-colors border border-red-200 rounded-xl font-medium"
                    >
                        {isDeleting ? (
                            <div className="w-4 h-4 border-2 border-red-600/30 border-t-red-600 rounded-full animate-spin" />
                        ) : (
                            <Trash2 size={16} />
                        )}
                        Eliminar Seleccionados ({selectedIds.length})
                    </button>
                )}
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto min-h-[400px]">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="p-4 w-12 text-center">
                                    <input 
                                        type="checkbox" 
                                        className="w-4 h-4 text-[#14B8A6] rounded border-slate-300 focus:ring-[#14B8A6]"
                                        checked={selectedIds.length === bookings.length && bookings.length > 0}
                                        onChange={handleSelectAll}
                                    />
                                </th>
                                <th className="p-4 font-semibold text-slate-600 text-xs tracking-wide">ID (Raw)</th>
                                <th className="p-4 font-semibold text-slate-600 text-sm">Negocio</th>
                                <th className="p-4 font-semibold text-slate-600 text-sm">Servicio</th>
                                <th className="p-4 font-semibold text-slate-600 text-sm">Fecha y Hora</th>
                                <th className="p-4 font-semibold text-slate-600 text-sm">Cliente</th>
                                <th className="p-4 font-semibold text-slate-600 text-sm">Monto</th>
                                <th className="p-4 font-semibold text-slate-600 text-sm">Estado</th>
                            </tr>
                        </thead>
                        <tbody>
                            {bookings.map((b) => (
                                <tr key={b.id} className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${selectedIds.includes(b.id) ? 'bg-slate-50' : ''}`}>
                                    <td className="p-4 text-center">
                                        <input 
                                            type="checkbox" 
                                            className="w-4 h-4 text-[#14B8A6] rounded border-slate-300 focus:ring-[#14B8A6]"
                                            checked={selectedIds.includes(b.id)}
                                            onChange={() => handleSelect(b.id)}
                                        />
                                    </td>
                                    <td className="p-4 text-[10px] font-mono text-slate-400" title={b.id}>
                                        {b.id?.slice(0, 8)}...
                                    </td>
                                    <td className="p-4">
                                        <span className="font-medium text-slate-900 line-clamp-2">
                                            {b.businessId ? (businessNames[b.businessId] || '—') : '—'}
                                        </span>
                                    </td>
                                    <td className="p-4 text-slate-600 text-sm">
                                        <span className="line-clamp-2">{b.serviceName || '—'}</span>
                                    </td>
                                    <td className="p-4 text-slate-600 whitespace-nowrap text-sm font-medium">
                                        {b.date || 'Sin Fecha'} <span className="text-slate-400">|</span> {b.time || ''}
                                    </td>
                                    <td className="p-4">
                                        <span className="text-sm font-medium text-slate-800 line-clamp-2">
                                            {b.clientId ? (clientNames[b.clientId] || b.clientName || '—') : '—'}
                                        </span>
                                    </td>
                                    <td className="p-4 text-slate-600 font-mono text-xs">
                                        {formatPrice(b.totalAmount || 0, b.currency)}
                                    </td>
                                    <td className="p-4">
                                        <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-wider
                                            ${b.status === 'pending' ? 'bg-amber-100 text-amber-700' : ''}
                                            ${b.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' : ''}
                                            ${b.status === 'canceled' ? 'bg-red-100 text-red-700' : ''}
                                            ${b.status === 'completed' ? 'bg-blue-100 text-blue-700' : ''}
                                            ${!b.status ? 'bg-slate-100 text-slate-500' : ''}
                                        `}>
                                            {b.status || 'N/A'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {bookings.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={8} className="p-12 text-center text-slate-500 flex flex-col items-center justify-center">
                                        <CheckSquare size={32} className="text-slate-300 mb-3" />
                                        {tStates('emptyData')}
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
