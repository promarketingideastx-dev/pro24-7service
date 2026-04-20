'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { BookingService } from '@/services/booking.service';
import { NotificationQueueService } from '@/services/notificationQueue.service';
import { BookingDocument } from '@/types/firestore-schema';
import { CheckCircle, XCircle, Clock, CalendarCheck, Trash2, Archive } from 'lucide-react';
import { toast } from 'sonner';
import { formatPrice } from '@/lib/currencyUtils';
import { useTranslations, useLocale } from 'next-intl';

export default function ProviderBookingsView() {
    const t = useTranslations('common.states');
    const tInbox = useTranslations('inbox');
    const tCancelModal = useTranslations('inbox.cancelModal');
    const tCommon = useTranslations('common');
    const { user } = useAuth();
    const [bookings, setBookings] = useState<BookingDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedProof, setSelectedProof] = useState<{url: string, type: string} | null>(null);
    const [cancelModalBooking, setCancelModalBooking] = useState<BookingDocument | null>(null);
    const [cancelNote, setCancelNote] = useState('');
    const [isCanceling, setIsCanceling] = useState(false);
    
    // --- DIAGNOSTIC LOGS ---
    const locale = useLocale();
    useEffect(() => {
        console.group('🔍 DIAGNÓSTICO I18N: ProviderBookingsView (Módulo de Cancelación)');
        console.log('1. Locale activo en este componente:', locale);
        console.log('2. Componente exacto montado: ProviderBookingsView.tsx');
        console.log('3. Llave cancelModal.title resolvió como:', tCancelModal('title'));
        console.log('4. Llave cancelModal.confirm resolvió como:', tCancelModal('confirm'));
        console.log('5. Llave cancelModal.noteLabel resolvió como:', tCancelModal('noteLabel'));
        console.log('6. Pathname actual:', window.location.pathname);
        console.groupEnd();
    }, [locale]);
    // -----------------------

    const loadBookings = async () => {
        if (!user?.uid) return;
        setLoading(true);
        try {
            const data = await BookingService.getByBusiness(user.uid);
            setBookings(data);
        } catch (error) {
            console.error(error);
            toast.error(t('errorLoading'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadBookings();
    }, [user?.uid]);

    const handleMutateStatus = async (booking: BookingDocument, newStatus: 'confirmed' | 'canceled' | 'completed', cancelNote?: string) => {
        try {
            // Unify: If confirming booking, automatically approve pending proof
            if (newStatus === 'confirmed' && booking.paymentStatus === 'proof_uploaded') {
                await BookingService.approvePaymentProof(booking.id);
            }

            await BookingService.updateStatus(booking.id, newStatus, cancelNote);
            
            // Interaction Tracking Hook: Canceling the queue since the business opened/interacted with the booking.
            if (user?.uid) {
                await NotificationQueueService.cancelByEntity(user.uid, booking.id);
            }

            // If confirmed or canceled, notify the client.
            if (newStatus === 'confirmed' || newStatus === 'canceled') {
                const targetEmail = booking.clientEmail || '';
                
                await NotificationQueueService.enqueueForBookingStatusChange(
                    booking.id,
                    booking.clientId,
                    targetEmail,
                    user?.displayName || 'El Negocio',
                    newStatus
                );

                // Send Instant Push to Client
                const title = newStatus === 'confirmed' ? 'Cita Confirmada' : 'Cita Cancelada';
                let body = newStatus === 'confirmed' 
                    ? `${user?.displayName || 'El negocio'} ha confirmado tu cita para ${booking.serviceName}.` 
                    : `${user?.displayName || 'El negocio'} ha cancelado tu cita para ${booking.serviceName}.`;
                
                if (newStatus === 'canceled' && cancelNote) {
                    body += ` (Mensaje adjunto, revisalo aquí)`;
                }
                    
                fetch('/api/push-client', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        customerUid: booking.clientId,
                        title,
                        body,
                        url: `/es/user/profile?bookingId=${booking.id}`
                    })
                }).catch(e => console.error('[Push Client Error]', e));
            }

            toast.success(t('successUpdated'));
            loadBookings();
        } catch (error) {
            console.error(error);
            toast.error(t('errorUpdating'));
        }
    };

    const handleArchiveBooking = async (booking: BookingDocument) => {
        try {
            await BookingService.hideForBusiness(booking.id);
            toast.success(t('successUpdated'));
            loadBookings();
        } catch (error) {
            console.error(error);
            toast.error(t('errorUpdating'));
        }
    };

    const handleApproveProof = async (booking: BookingDocument) => {
        try {
            // Unify: Approving proof automatically confirms the booking
            await BookingService.approvePaymentProof(booking.id);
            if (booking.status === 'pending') {
                await BookingService.updateStatus(booking.id, 'confirmed');
                if (user?.uid) {
                    await NotificationQueueService.cancelByEntity(user.uid, booking.id);
                }
            }

            const targetEmail = booking.clientEmail || ''; 
            await NotificationQueueService.enqueueForPaymentProofStatus(
                booking.id,
                booking.clientId,
                targetEmail,
                user?.displayName || 'El Negocio',
                'proof_approved'
            );
            
            // Push Notification
            fetch('/api/push-client', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    customerUid: booking.clientId,
                    title: 'Pago Confirmado',
                    body: `${user?.displayName || 'El negocio'} ha verificado tu pago exitosamente.`,
                    url: `/es/user/profile?bookingId=${booking.id}`
                })
            }).catch(e => console.error('[Push Client Error]', e));

            toast.success(t('successUpdated'));
            loadBookings();
        } catch (error) {
            console.error(error);
            toast.error(t('errorUpdating'));
        }
    };

    const handleRejectProof = async (booking: BookingDocument) => {
        try {
            await BookingService.rejectPaymentProof(booking.id);
            const targetEmail = booking.clientEmail || ''; 
            await NotificationQueueService.enqueueForPaymentProofStatus(
                booking.id,
                booking.clientId,
                targetEmail,
                user?.displayName || 'El Negocio',
                'proof_rejected'
            );

            // Push Notification
            fetch('/api/push-client', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    customerUid: booking.clientId,
                    title: 'Comprobante Rechazado',
                    body: `${user?.displayName || 'El negocio'} ha rechazado tu comprobante. Sube uno nuevo.`,
                    url: `/es/user/profile?bookingId=${booking.id}`
                })
            }).catch(e => console.error('[Push Client Error]', e));

            toast.success(t('successUpdated'));
            loadBookings();
        } catch (error) {
            console.error(error);
            toast.error(t('errorUpdating'));
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-slate-500">{t('loadingSystem')}</div>;
    }

    return (
        <div className="p-4 sm:p-8 max-w-5xl mx-auto space-y-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                    <CalendarCheck className="text-[#14B8A6]" />
                    {tInbox('pageTitle')}
                </h1>
            </div>

            {bookings.length === 0 ? (
                <div className="p-12 text-center text-slate-500 bg-white rounded-2xl shadow-sm border border-slate-100">
                    {tInbox('noBookings')}
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
                                        {booking.status === 'pending' ? tInbox('badgePending') : 
                                         booking.status === 'confirmed' ? tInbox('badgeConfirmed') :
                                         booking.status === 'canceled' ? tInbox('badgeCancelled') :
                                         booking.status === 'completed' ? tInbox('badgeCompleted') : booking.status}
                                    </span>
                                    
                                    {/* Payment Status Badge */}
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider
                                        ${booking.paymentStatus === 'pending' || booking.paymentStatus === 'instructions_sent' ? 'bg-slate-100 text-slate-600' : ''}
                                        ${booking.paymentStatus === 'proof_uploaded' ? 'bg-blue-100 text-blue-700' : ''}
                                        ${booking.paymentStatus === 'confirmed' ? 'bg-[#14B8A6]/10 text-[#14B8A6]' : ''}
                                        ${booking.paymentStatus === 'rejected' ? 'bg-red-100 text-red-700' : ''}
                                    `}>
                                        {tInbox('payment')}: {(booking.paymentStatus || 'No definido').replace('proof_uploaded', 'PROOF UPLOADED')}
                                    </span>

                                    <span className="text-xs text-slate-400 font-medium bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                                        <Clock size={12} className="inline mr-1 -mt-0.5" />
                                        {booking.date} a las {booking.time}
                                    </span>
                                </div>
                                <h3 className="font-bold text-slate-900 text-lg leading-tight">{booking.serviceName}</h3>
                                <p className="text-sm text-slate-500">{tInbox('client')}: {booking.clientName} ({booking.clientPhone})</p>
                                <div className="text-sm font-medium mt-1 bg-slate-50 inline-block px-3 py-1 rounded-lg border border-slate-100">
                                    <span className="text-slate-400 text-xs mr-2">{tInbox('total')}:</span> 
                                    {formatPrice(booking.totalAmount, booking.currency)}
                                </div>

                                {/* Client Notes */}
                                {(booking.notes || booking.notesClient) && (
                                    <div className="mt-3 text-sm text-slate-700 bg-amber-50/50 p-3 flex-1 rounded-xl border border-amber-100/50 italic">
                                        <span className="font-semibold not-italic block mb-1 text-amber-900/60 text-xs uppercase tracking-wide">{tInbox('clientNotes')}</span>
                                        "{booking.notes || booking.notesClient}"
                                    </div>
                                )}

                                {/* Payment Proof Section */}
                                {booking.paymentProof && (
                                    <div className="mt-3 p-3 bg-blue-50/50 border border-blue-100 rounded-xl max-w-sm">
                                        <p className="text-xs font-bold text-blue-900 mb-2">{tInbox('attachedProof')}</p>
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => setSelectedProof({ url: booking.paymentProof!.url, type: booking.paymentProof!.type })}
                                                className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg font-medium transition-colors"
                                            >
                                                {tInbox('viewFile')} ({booking.paymentProof?.type || ''})
                                            </button>
                                            {booking.paymentStatus === 'proof_uploaded' && booking.status === 'pending' && (
                                                <>
                                                    <button onClick={() => handleApproveProof(booking)} className="text-xs bg-emerald-100 hover:bg-emerald-200 text-emerald-700 px-3 py-1.5 rounded-lg font-bold transition-colors">{tInbox('accept')}</button>
                                                    <button onClick={() => handleRejectProof(booking)} className="text-xs bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1.5 rounded-lg font-bold transition-colors">{tInbox('reject')}</button>
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
                                            <CheckCircle size={16} /> {tInbox('accept')}
                                        </button>
                                        <button 
                                            onClick={() => {
                                                setCancelModalBooking(booking);
                                                setCancelNote('');
                                            }}
                                            className="px-4 py-2.5 bg-white border border-red-200 hover:bg-red-50 text-red-600 text-sm font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 w-full md:w-auto"
                                        >
                                            <XCircle size={16} /> {tInbox('reject')}
                                        </button>
                                    </>
                                )}
                                {booking.status === 'confirmed' && (
                                    <>
                                        <button 
                                            onClick={() => handleMutateStatus(booking, 'completed')}
                                            className="px-4 py-2 bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-700 text-sm font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 w-full md:w-auto"
                                        >
                                            <CheckCircle size={16} /> {tInbox('badgeCompleted')}
                                        </button>
                                        <button 
                                            onClick={() => {
                                                setCancelModalBooking(booking);
                                                setCancelNote('');
                                            }}
                                            className="px-4 py-2 bg-white border border-red-200 hover:bg-red-50 text-red-600 text-sm font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 w-full md:w-auto mt-2 md:mt-0"
                                        >
                                            <XCircle size={16} /> {tCancelModal('title')}
                                        </button>
                                    </>
                                )}
                                {(booking.status === 'canceled' || booking.status === 'completed') && (
                                    <button 
                                        onClick={() => {
                                            if (window.confirm(tInbox('archiveConfirm'))) {
                                                handleArchiveBooking(booking);
                                            }
                                        }}
                                        className="px-4 py-2.5 bg-slate-50 border border-slate-200 hover:bg-slate-100/80 text-slate-500 hover:text-slate-800 text-sm font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 w-full md:w-auto"
                                    >
                                        <Archive size={16} /> {tInbox('archiveBtn')}
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Cancel / Reject Modal */}
            {cancelModalBooking && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                                <XCircle className="w-5 h-5 text-red-500" />
                                {tCancelModal('title')}
                            </h3>
                            <button 
                                onClick={() => setCancelModalBooking(null)}
                                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-200/50 text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition-colors"
                            >
                                <XCircle size={18} />
                            </button>
                        </div>
                        <div className="p-6">
                            <p className="text-sm text-slate-600 mb-5 leading-relaxed">
                                {tCancelModal('description')}
                            </p>
                            
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                                {tCancelModal('noteLabel')}
                            </label>
                            <textarea 
                                value={cancelNote}
                                onChange={e => setCancelNote(e.target.value)}
                                placeholder={tCancelModal('notePlaceholder')}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all resize-none h-24"
                            />
                        </div>
                        <div className="p-6 bg-slate-50 border-t border-slate-100 flex flex-col-reverse sm:flex-row gap-3">
                            <button 
                                onClick={() => setCancelModalBooking(null)}
                                className="w-full sm:w-1/2 px-4 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-200 hover:text-slate-800 transition-colors"
                            >
                                {tCancelModal('close')}
                            </button>
                            <button 
                                onClick={async () => {
                                    setIsCanceling(true);
                                    await handleMutateStatus(cancelModalBooking, 'canceled', cancelNote);
                                    setCancelModalBooking(null);
                                    setCancelNote('');
                                    setIsCanceling(false);
                                }}
                                disabled={isCanceling}
                                className="w-full sm:w-1/2 px-4 py-2.5 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 active:bg-red-800 disabled:opacity-50 transition-colors shadow-sm"
                            >
                                {isCanceling ? t('processing') : tCancelModal('confirm')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* In-App Evidence Viewer Modal */}
            {selectedProof && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md">
                    <div className="w-full max-w-3xl flex flex-col h-full sm:h-auto max-h-screen">
                        <div className="flex justify-between items-center bg-black/50 p-4 rounded-t-xl">
                            <span className="text-white font-semibold">{tInbox('attachedProof')}</span>
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
