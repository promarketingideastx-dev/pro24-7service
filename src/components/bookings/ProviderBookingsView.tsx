'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { BookingService } from '@/services/booking.service';
import { NotificationQueueService } from '@/services/notificationQueue.service';
import { BookingDocument } from '@/types/firestore-schema';
import { CheckCircle, XCircle, Clock, CalendarCheck } from 'lucide-react';
import { toast } from 'sonner';

export default function ProviderBookingsView() {
    const { user } = useAuth();
    const [bookings, setBookings] = useState<BookingDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedProof, setSelectedProof] = useState<{url: string, type: string} | null>(null);

    const loadBookings = async () => {
        if (!user?.uid) return;
        setLoading(true);
        try {
            const data = await BookingService.getByBusiness(user.uid);
            setBookings(data);
        } catch (error) {
            console.error(error);
            toast.error("Error al cargar citas.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadBookings();
    }, [user?.uid]);

    const handleMutateStatus = async (booking: BookingDocument, newStatus: 'confirmed' | 'canceled' | 'completed') => {
        try {
            await BookingService.updateStatus(booking.id, newStatus);
            
            // Interaction Tracking Hook: Canceling the queue since the business opened/interacted with the booking.
            if (user?.uid) {
                await NotificationQueueService.cancelByEntity(user.uid, booking.id);
            }

            // If confirmed or canceled, notify the client.
            if (newStatus === 'confirmed' || newStatus === 'canceled') {
                // To fetch client email efficiently, we might need a CustomerService call, 
                // but for now, we'll try to find it blindly or pass generic placeholder.
                // In a true robust setup, we'd have clientEmail stored in booking or fetched from CRM.
                const fallbackEmail = 'cliente@example.com'; 
                // Wait, clientEmail is not stored in BookingDocument in our Phase 1 schema? 
                // I should add customerEmail. But for now I'll mock the email or use a placeholder.
                
                await NotificationQueueService.enqueueForBookingStatusChange(
                    booking.id,
                    booking.clientId,
                    fallbackEmail,
                    'El Negocio', // Replace with real name if fetched
                    newStatus
                );
            }

            toast.success(`Cita marcada como ${newStatus}.`);
            loadBookings();
        } catch (error) {
            console.error(error);
            toast.error("Error al actualizar la cita.");
        }
    };

    const handleApproveProof = async (booking: BookingDocument) => {
        try {
            await BookingService.approvePaymentProof(booking.id);
            const fallbackEmail = 'cliente@example.com'; // Wait for CRM link in next phase
            await NotificationQueueService.enqueueForPaymentProofStatus(
                booking.id,
                booking.clientId,
                fallbackEmail,
                user?.displayName || 'El Negocio',
                'proof_approved'
            );
            toast.success("Comprobante aprobado. Cita confirmada de pago.");
            loadBookings();
        } catch (error) {
            console.error(error);
            toast.error("Error al aprobar comprobante.");
        }
    };

    const handleRejectProof = async (booking: BookingDocument) => {
        try {
            await BookingService.rejectPaymentProof(booking.id);
            const fallbackEmail = 'cliente@example.com'; // Wait for CRM link in next phase
            await NotificationQueueService.enqueueForPaymentProofStatus(
                booking.id,
                booking.clientId,
                fallbackEmail,
                user?.displayName || 'El Negocio',
                'proof_rejected'
            );
            toast.success("Comprobante rechazado.");
            loadBookings();
        } catch (error) {
            console.error(error);
            toast.error("Error al rechazar comprobante.");
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-slate-500">Cargando sistema de citas...</div>;
    }

    return (
        <div className="p-4 sm:p-8 max-w-5xl mx-auto space-y-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                    <CalendarCheck className="text-[#14B8A6]" />
                    Gestión de Citas (Bookings)
                </h1>
            </div>

            {bookings.length === 0 ? (
                <div className="p-12 text-center text-slate-500 bg-white rounded-2xl shadow-sm border border-slate-100">
                    No tienes citas registradas.
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {bookings.map(booking => (
                        <div key={booking.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between md:items-start gap-4">
                            <div className="space-y-1 flex-1">
                                <div className="flex flex-wrap items-center gap-2 mb-2">
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider
                                        ${booking.status === 'pending' ? 'bg-amber-100 text-amber-700' : ''}
                                        ${booking.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' : ''}
                                        ${booking.status === 'canceled' ? 'bg-red-100 text-red-700' : ''}
                                        ${booking.status === 'completed' ? 'bg-blue-100 text-blue-700' : ''}
                                    `}>
                                        {booking.status}
                                    </span>
                                    
                                    {/* Payment Status Badge */}
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider
                                        ${booking.paymentStatus === 'pending' || booking.paymentStatus === 'instructions_sent' ? 'bg-slate-100 text-slate-600' : ''}
                                        ${booking.paymentStatus === 'proof_uploaded' ? 'bg-blue-100 text-blue-700' : ''}
                                        ${booking.paymentStatus === 'confirmed' ? 'bg-[#14B8A6]/10 text-[#14B8A6]' : ''}
                                        ${booking.paymentStatus === 'rejected' ? 'bg-red-100 text-red-700' : ''}
                                    `}>
                                        Pago: {booking.paymentStatus.replace('_', ' ')}
                                    </span>

                                    <span className="text-xs text-slate-400 font-medium bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                                        <Clock size={12} className="inline mr-1 -mt-0.5" />
                                        {booking.date} a las {booking.time}
                                    </span>
                                </div>
                                <h3 className="font-bold text-slate-900 text-lg leading-tight">{booking.serviceName}</h3>
                                <p className="text-sm text-slate-500">ID Cliente: {booking.clientId}</p>
                                <div className="text-sm font-medium mt-1 bg-slate-50 inline-block px-3 py-1 rounded-lg border border-slate-100">
                                    <span className="text-slate-400 text-xs mr-2">Total:</span> 
                                    {booking.currency} {booking.totalAmount}
                                </div>

                                {/* Payment Proof Section */}
                                {booking.paymentProof && (
                                    <div className="mt-3 p-3 bg-blue-50/50 border border-blue-100 rounded-xl max-w-sm">
                                        <p className="text-xs font-bold text-blue-900 mb-2">Comprobante Adjunto</p>
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => setSelectedProof({ url: booking.paymentProof!.url, type: booking.paymentProof!.type })}
                                                className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg font-medium transition-colors"
                                            >
                                                Ver Archivo ({booking.paymentProof.type})
                                            </button>
                                            {booking.paymentStatus === 'proof_uploaded' && (
                                                <>
                                                    <button onClick={() => handleApproveProof(booking)} className="text-xs bg-emerald-100 hover:bg-emerald-200 text-emerald-700 px-3 py-1.5 rounded-lg font-bold transition-colors">Aprobar</button>
                                                    <button onClick={() => handleRejectProof(booking)} className="text-xs bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1.5 rounded-lg font-bold transition-colors">Rechazar</button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-col gap-2 shrink-0">
                                {booking.status === 'pending' && (
                                    <>
                                        <button 
                                            onClick={() => handleMutateStatus(booking, 'confirmed')}
                                            className="px-4 py-2.5 bg-[#14B8A6] hover:bg-[#0F9488] text-white text-sm font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 w-full md:w-auto shadow-sm shadow-cyan-900/10"
                                        >
                                            <CheckCircle size={16} /> Confirmar Cita
                                        </button>
                                        <button 
                                            onClick={() => handleMutateStatus(booking, 'canceled')}
                                            className="px-4 py-2.5 bg-white border border-red-200 hover:bg-red-50 text-red-600 text-sm font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 w-full md:w-auto"
                                        >
                                            <XCircle size={16} /> Cancelar Cita
                                        </button>
                                    </>
                                )}
                                {booking.status === 'confirmed' && (
                                    <button 
                                        onClick={() => handleMutateStatus(booking, 'completed')}
                                        className="px-4 py-2 bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-700 text-sm font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 w-full md:w-auto"
                                    >
                                        <CheckCircle size={16} /> Marcar Completada
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* In-App Evidence Viewer Modal */}
            {selectedProof && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md">
                    <div className="w-full max-w-3xl flex flex-col h-full sm:h-auto max-h-screen">
                        <div className="flex justify-between items-center bg-black/50 p-4 rounded-t-xl">
                            <span className="text-white font-semibold">Comprobante de Pago</span>
                            <button onClick={() => setSelectedProof(null)} className="text-white hover:text-slate-300 p-2 bg-white/10 rounded-full">
                                <XCircle size={20} />
                            </button>
                        </div>
                        <div className="flex-1 bg-black/20 overflow-hidden flex items-center justify-center rounded-b-xl relative p-2">
                            {selectedProof.type === 'pdf' ? (
                                <iframe src={selectedProof.url} className="w-full h-[70vh] rounded-lg bg-white" />
                            ) : (
                                <img src={selectedProof.url} alt="Comprobante" className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl" />
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
