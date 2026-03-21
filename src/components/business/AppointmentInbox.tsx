'use client';

import { useState, useEffect, useRef } from 'react';
import { BookingService } from '@/services/booking.service';
import { BookingDocument } from '@/types/firestore-schema';
import { BusinessNotificationService } from '@/services/businessNotification.service';
import { ClientNotificationService } from '@/services/clientNotification.service';
import { format } from 'date-fns';
import { es, enUS, ptBR } from 'date-fns/locale';
import { Calendar, Clock, CheckCircle, XCircle, AlertCircle, User, MessageCircle, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAppointmentRefresh } from '@/context/AppointmentRefreshContext';
import { useTranslations, useLocale } from 'next-intl';
import { unlockAudio, playNotificationSound } from '@/lib/audioUtils';

interface AppointmentInboxProps {
    businessId: string;
    businessName?: string;
    businessEmail?: string;
    businessPhone?: string;
}

const DEFAULT_REJECTION_TEXT =
    'Hola, gracias por agendar con nosotros. Lamentablemente en este momento no podemos confirmar tu cita. ' +
    'Nos pondremos en contacto contigo para buscar la mejor opción. ' +
    'Si tienes alguna pregunta, no dudes en escribirnos o llamarnos.';

const DEFAULT_CONFIRM_NOTE =
    'Hola, gracias por agendar con nosotros. Nos pondremos en contacto contigo para afinar los detalles. ' +
    'Si tienes alguna pregunta, no dudes en escribirnos o llamarnos.';

export default function AppointmentInbox({
    businessId,
    businessName = '',
    businessEmail = '',
    businessPhone = '',
}: AppointmentInboxProps) {
    const t = useTranslations('inbox');
    const locale = useLocale();
    const dateFnsLocale = locale === 'en' ? enUS : locale === 'pt-BR' ? ptBR : es;

    const [activeTab, setActiveTab] = useState<'pending' | 'upcoming' | 'history'>('pending');
    const [appointments, setAppointments] = useState<BookingDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const { triggerRefresh } = useAppointmentRefresh();

    // ── Rejection modal state ─────────────────────────────────────────────────
    const [rejectTarget, setRejectTarget] = useState<BookingDocument | null>(null);
    const [rejectReason, setRejectReason] = useState(DEFAULT_REJECTION_TEXT);
    const MAX_CHARS = 250;

    // ── Multi-select state ────────────────────────────────────────────────────
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // ── Sound ─────────────────────────────────────────────────────────────────
    useEffect(() => {
        const unlock = () => unlockAudio();
        document.addEventListener('touchstart', unlock, { once: true });
        document.addEventListener('click', unlock, { once: true });
        return () => {
            document.removeEventListener('touchstart', unlock);
            document.removeEventListener('click', unlock);
        };
    }, []);

    const playSound = () => playNotificationSound();

    // ── Fetch ─────────────────────────────────────────────────────────────────
    const [allBookings, setAllBookings] = useState<BookingDocument[]>([]);

    useEffect(() => {
        if (!businessId) return;
        setLoading(true);
        const unsubscribe = BookingService.onBookingsByBusiness(businessId, (bookings) => {
            setAllBookings(bookings);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [businessId]);

    useEffect(() => {
        let data: BookingDocument[] = [];

        if (activeTab === 'pending') {
            data = allBookings.filter(b => b.status === 'pending');
        } else if (activeTab === 'upcoming') {
            const now = new Date();
            data = allBookings.filter(b => b.status === 'confirmed' && new Date(b.date + 'T' + b.time) >= now);
        } else {
            const now = new Date();
            data = allBookings.filter(b => 
                b.status === 'canceled' || b.status === 'completed' ||
                (b.status === 'confirmed' && new Date(b.date + 'T' + b.time) < now)
            );
        }

        data.sort((a, b) => {
            const dateA = new Date(a.date + 'T' + a.time).getTime();
            const dateB = new Date(b.date + 'T' + b.time).getTime();
            return activeTab === 'history' ? dateB - dateA : dateA - dateB;
        });

        setAppointments(data);
    }, [allBookings, activeTab]);

    useEffect(() => {
        setSelectedIds(new Set());
    }, [businessId, activeTab]);

    const handleSelectAll = () => {
        if (appointments.length === 0) return;
        if (selectedIds.size === appointments.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(appointments.map(a => a.id!)));
        }
    };

    const handleToggleSelect = (id: string | undefined) => {
        if (!id) return;
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    };

    const executeDelete = async () => {
        if (selectedIds.size === 0) return;
        setLoading(true);
        setShowDeleteConfirm(false);
        try {
            await BookingService.deleteBookings(Array.from(selectedIds));
            toast.success(`${selectedIds.size} ${t('deletedCount') || 'citas eliminadas'}`);
            setSelectedIds(new Set());
            triggerRefresh(); // global inbox count trigger
        } catch (error) {
            console.error('Error deleting:', error);
            toast.error(t('updateError'));
            setLoading(false);
        }
    };

    // ── Helpers ────────────────────────────────────────────────────────────────
    const fmtDate = (apt: BookingDocument) =>
        format(new Date(apt.date + 'T' + apt.time), 'PPP p', { locale: dateFnsLocale });

    const sendEmailFf = (type: string, to: string, data: Record<string, any>) => {
        fetch('/api/notify-business', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type, to, data }),
        }).catch(() => { });
    };

    const sendPushToClient = (customerUid: string | undefined, title: string, body: string) => {
        if (!customerUid) return;
        fetch('/api/push-client', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ customerUid, title, body, url: `/${locale}/user/profile` }),
        }).catch(() => { });
    };

    // ── Accept ────────────────────────────────────────────────────────────────
    const handleAccept = async (apt: BookingDocument) => {
        if (!apt.id) return;
        setProcessingId(apt.id);
        try {
            await BookingService.updateStatus(apt.id, 'confirmed');

            toast.success(t('statusAccepted'));
            triggerRefresh();

            // Notify business (in-app)
            await BusinessNotificationService.create(businessId, {
                type: 'appointment_confirmed',
                title: `✅ Cita confirmada: ${apt.clientName || 'Cliente'}`,
                body: `${apt.serviceName} · ${fmtDate(apt)}`,
                relatedId: apt.id,
                relatedName: apt.clientName || 'Cliente',
            });

            // Email to client
            if (apt.clientEmail) {
                sendEmailFf('appointment_confirmed', apt.clientEmail, {
                    clientName: apt.clientName || 'Cliente',
                    businessName: businessName || 'el negocio',
                    serviceName: apt.serviceName,
                    dateLabel: fmtDate(apt),
                    businessPhone,
                });
            }

            // Push notification to client (if they have FCM token)
            sendPushToClient(
                apt.clientId,
                '✅ Cita confirmada',
                `Tu cita de ${apt.serviceName} con ${businessName || 'el negocio'} fue confirmada.`
            );

            // In-app bell notification for the client
            if (apt.clientId) {
                ClientNotificationService.create(apt.clientId, {
                    type: 'appointment_confirmed',
                    title: '✅ Cita confirmada',
                    body: `Tu cita de ${apt.serviceName} con ${businessName || 'el negocio'} fue confirmada.`,
                    relatedId: apt.id,
                    relatedName: businessName,
                }).catch(() => { });
            }
        } catch (error) {
            console.error('Error accepting:', error);
            toast.error(t('updateError'));
        } finally {
            setProcessingId(null);
        }
    };

    // ── Reject (confirm from modal) ───────────────────────────────────────────
    const handleRejectConfirm = async () => {
        if (!rejectTarget?.id) return;
        setProcessingId(rejectTarget.id);
        try {
            await BookingService.updateStatus(rejectTarget.id, 'canceled');

            toast.success(t('statusRejected'));
            triggerRefresh();

            // Email to client
            if (rejectTarget.clientEmail) {
                sendEmailFf('appointment_rejected', rejectTarget.clientEmail, {
                    clientName: rejectTarget.clientName || 'Cliente',
                    businessName: businessName || 'el negocio',
                    serviceName: rejectTarget.serviceName,
                    reason: rejectReason,
                    businessPhone,
                });
            }

            // Push notification to client
            sendPushToClient(
                rejectTarget.clientId,
                '📋 Actualización de cita',
                `Tu solicitud de ${rejectTarget.serviceName} con ${businessName || 'el negocio'} no pudo ser confirmada.`
            );

            // In-app bell notification for the client
            if (rejectTarget.clientId) {
                ClientNotificationService.create(rejectTarget.clientId, {
                    type: 'appointment_rejected',
                    title: '❌ Cita no confirmada',
                    body: `Tu cita de ${rejectTarget.serviceName} con ${businessName || 'el negocio'} no pudo confirmarse.`,
                    relatedId: rejectTarget.id,
                    relatedName: businessName,
                }).catch(() => { });
            }

            setRejectTarget(null);
            setRejectReason(DEFAULT_REJECTION_TEXT);
        } catch (error) {
            console.error('Error rejecting:', error);
            toast.error(t('updateError'));
        } finally {
            setProcessingId(null);
        }
    };

    const tabs = [
        { id: 'pending', label: t('tabPending'), icon: <AlertCircle size={16} /> },
        { id: 'upcoming', label: t('tabUpcoming'), icon: <Calendar size={16} /> },
        { id: 'history', label: t('tabHistory'), icon: <Clock size={16} /> },
    ];

    // Status badge colors
    const statusBadge: Record<string, string> = {
        pending: 'border-amber-300 text-amber-700 bg-amber-50',
        confirmed: 'border-[#14B8A6]/40 text-[#0F766E] bg-[rgba(20,184,166,0.08)]',
        completed: 'border-green-300 text-green-700 bg-green-50',
        canceled: 'border-red-300 text-red-600 bg-red-50',
        'no-show': 'border-slate-300 text-slate-500 bg-slate-50',
    };

    // Left-border accent per status (appointment card)
    const statusBorderLeft: Record<string, string> = {
        pending: 'border-l-4 border-l-amber-400',
        confirmed: 'border-l-4 border-l-[#14B8A6]',
        completed: 'border-l-4 border-l-green-400',
        canceled: 'border-l-4 border-l-red-400',
        'no-show': 'border-l-4 border-l-slate-300',
    };

    return (
        <>
            {/* ── Inbox Container ─────────────────────────────────────────── */}
            <div className="bg-white border border-[#E6E8EC] rounded-2xl overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
                {/* Tabs */}
                <div className="flex border-b border-[#E6E8EC] bg-[#F8FAFC]">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-semibold transition-all relative
                                ${activeTab === tab.id
                                    ? 'text-[#14B8A6] bg-white'
                                    : 'text-slate-500 hover:text-slate-800 hover:bg-white/60'
                                }
                            `}
                        >
                            {tab.icon}
                            {tab.label}
                            {activeTab === tab.id && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#14B8A6]" />
                            )}
                        </button>
                    ))}
                </div>

                {/* List */}
                <div className="p-4 flex flex-col min-h-[300px] bg-[#F8FAFC] relative pb-20">
                    {!loading && appointments.length > 0 && (
                        <div className="flex items-center gap-3 mb-4 px-2">
                            <button 
                                onClick={handleSelectAll}
                                className="w-5 h-5 rounded border-2 flex items-center justify-center transition-colors border-slate-300 hover:border-[#14B8A6] cursor-pointer"
                            >
                                {selectedIds.size === appointments.length && (
                                    <div className="w-2.5 h-2.5 bg-[#14B8A6] rounded-sm" />
                                )}
                            </button>
                            <span className="text-sm font-semibold text-slate-600">
                                {selectedIds.size > 0 ? `${selectedIds.size} seleccionadas` : 'Seleccionar todas'}
                            </span>
                        </div>
                    )}

                    {loading ? (
                        <div className="flex justify-center items-center h-48 text-slate-400 animate-pulse gap-2">
                            <div className="w-5 h-5 rounded-full border-2 border-[#14B8A6]/30 border-t-[#14B8A6] animate-spin" />
                            {t('loading')}
                        </div>
                    ) : appointments.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-48 text-slate-400">
                            <div className="w-12 h-12 rounded-full bg-[rgba(20,184,166,0.08)] flex items-center justify-center mb-3">
                                <Clock size={20} className="text-[#14B8A6]" />
                            </div>
                            <p className="text-sm">{t('empty')}</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {appointments.map((apt) => (
                                <div
                                    key={apt.id}
                                    className={`bg-white border border-[#E6E8EC] rounded-xl p-4 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] transition-all ${statusBorderLeft[apt.status] ?? 'border-l-4 border-l-slate-200'} ${selectedIds.has(apt.id!) ? 'ring-2 ring-[#14B8A6]' : ''}`}
                                >
                                    {/* Selection Checkbox & Status icon */}
                                    <div className="flex items-start gap-4">
                                        <button 
                                            onClick={() => handleToggleSelect(apt.id)}
                                            className="w-5 h-5 mt-1.5 rounded border-2 flex shrink-0 items-center justify-center transition-colors cursor-pointer border-slate-300 hover:border-[#14B8A6]"
                                        >
                                            {selectedIds.has(apt.id!) && (
                                                <div className="w-2.5 h-2.5 bg-[#14B8A6] rounded-sm" />
                                            )}
                                        </button>
                                        <div className={`p-2.5 rounded-xl shrink-0 ${apt.status === 'confirmed' ? 'bg-[rgba(20,184,166,0.10)] text-[#14B8A6]' :
                                            apt.status === 'pending' ? 'bg-amber-50 text-amber-500' :
                                                apt.status === 'completed' ? 'bg-green-50 text-green-500' :
                                                    apt.status === 'canceled' ? 'bg-red-50 text-red-500' :
                                                        'bg-slate-100 text-slate-400'
                                            }`}>
                                            <User size={18} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-900 text-base">{apt.clientName || 'Cliente'}</h4>
                                            <div className="flex flex-col gap-1 mt-1 text-sm text-slate-500">
                                                <div className="flex items-center gap-2">
                                                    <Calendar size={13} className="text-[#14B8A6]" />
                                                    <span>{format(new Date(apt.date + 'T' + apt.time), 'PPP', { locale: dateFnsLocale })}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Clock size={13} className="text-[#2563EB]" />
                                                    <span>{format(new Date(apt.date + 'T' + apt.time), 'p', { locale: dateFnsLocale })}</span>
                                                    <span className="text-slate-300">•</span>
                                                    <span className="text-slate-700 font-medium">{apt.serviceName}</span>
                                                </div>
                                                {apt.notesClient && (
                                                    <div className="flex items-start gap-2 mt-1 px-2 py-1.5 bg-[#F8FAFC] border border-[#E6E8EC] rounded-lg text-xs italic text-slate-500">
                                                        <MessageCircle size={11} className="mt-0.5 shrink-0 text-slate-400" />
                                                        "{apt.notesClient}"
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Actions (pending tab only) */}
                                    {activeTab === 'pending' && (
                                        <div className="flex items-center gap-2 w-full md:w-auto mt-2 md:mt-0">
                                            <button
                                                onClick={() => { setRejectTarget(apt); setRejectReason(DEFAULT_REJECTION_TEXT); }}
                                                disabled={!!processingId}
                                                className="flex-1 md:flex-none px-4 py-2 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50 font-medium text-sm"
                                            >
                                                {t('reject')}
                                            </button>
                                            <button
                                                onClick={() => handleAccept(apt)}
                                                disabled={!!processingId}
                                                className="flex-1 md:flex-none px-4 py-2 rounded-lg bg-[#14B8A6] text-white font-bold hover:bg-[#0F9488] shadow-[0_4px_12px_rgba(20,184,166,0.30)] hover:shadow-[0_6px_16px_rgba(20,184,166,0.45)] transition-all disabled:opacity-50 text-sm"
                                            >
                                                {processingId === apt.id ? '...' : t('accept')}
                                            </button>
                                        </div>
                                    )}

                                    {/* Status badge (other tabs) */}
                                    {activeTab !== 'pending' && (
                                        <div className={`shrink-0 flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${statusBadge[apt.status] ?? statusBadge.pending}`}>
                                            {apt.status === 'confirmed' && <><CheckCircle size={11} /> {t('badgeConfirmed')}</>}
                                            {apt.status === 'canceled' && <><XCircle size={11} />    {t('badgeCancelled')}</>}
                                            {apt.status === 'completed' && <><CheckCircle size={11} /> {t('badgeCompleted')}</>}
                                            {apt.status === 'pending' && <><AlertCircle size={11} /> {t('badgePending')}</>}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Floating Delete Action Bar ─────────────────────────────── */}
            {selectedIds.size > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900 text-white px-6 py-4 rounded-full shadow-2xl flex items-center justify-between gap-6 min-w-[300px] border border-slate-700 animate-in slide-in-from-bottom-8">
                    <span className="font-semibold text-sm">
                        {selectedIds.size} seleccionada{selectedIds.size !== 1 ? 's' : ''}
                    </span>
                    <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="flex items-center gap-2 bg-red-500 hover:bg-red-600 px-4 py-2 rounded-full text-sm font-bold transition-colors"
                    >
                        <Trash2 size={16} />
                        Eliminar
                    </button>
                </div>
            )}

            {/* ── Delete Confirmation Modal ────────────────────────────── */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
                    <div className="bg-white border border-[#E6E8EC] rounded-2xl p-6 w-full max-w-sm shadow-2xl text-center">
                        <div className="mx-auto w-12 h-12 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-4">
                            <AlertCircle size={24} />
                        </div>
                        <h3 className="font-bold text-lg text-slate-900 mb-2">¿Eliminar {selectedIds.size} cita{selectedIds.size !== 1 ? 's' : ''}?</h3>
                        <p className="text-slate-500 text-sm mb-6 leading-relaxed">
                            Esta acción es permanente y eliminará los registros de Firebase de forma irreversible.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                className="flex-1 py-3 rounded-xl border border-[#E6E8EC] text-slate-600 hover:bg-[#F8FAFC] text-sm font-medium transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={executeDelete}
                                className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-sm transition-colors shadow-[0_4px_12px_rgba(239,68,68,0.25)]"
                            >
                                Eliminar todo
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Rejection Reason Modal ───────────────────────────────────── */}
            {rejectTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
                    <div className="bg-white border border-[#E6E8EC] rounded-2xl p-6 w-full max-w-md shadow-2xl">
                        {/* Banner-danger pattern for modal header */}
                        <div className="banner-danger mb-4">
                            <h3 className="font-bold text-base flex items-center gap-2">
                                <XCircle size={18} className="text-red-500" />
                                Rechazar cita
                            </h3>
                            <p className="text-sm mt-1 text-red-600/80">
                                <strong>{rejectTarget.clientName || 'Cliente'}</strong>
                                {' · '}{rejectTarget.serviceName} · {fmtDate(rejectTarget)}
                            </p>
                        </div>

                        <label className="block text-xs text-slate-500 mb-2 uppercase tracking-wider font-semibold">
                            Motivo (se enviará al cliente por email)
                        </label>
                        <textarea
                            value={rejectReason}
                            onChange={e => setRejectReason(e.target.value.slice(0, MAX_CHARS))}
                            className="w-full bg-[#F8FAFC] border border-[#E6E8EC] rounded-xl p-3 text-slate-900 text-sm outline-none focus:border-red-300 focus:ring-1 focus:ring-red-200 resize-none h-32 leading-relaxed"
                        />
                        <p className={`text-right text-xs mt-1 ${rejectReason.length >= MAX_CHARS ? 'text-red-500' : 'text-slate-400'}`}>
                            {rejectReason.length}/{MAX_CHARS}
                        </p>

                        <p className="text-xs text-slate-400 mt-1 mb-4 italic">
                            Puedes editar el texto antes de enviar. El cliente recibirá este mensaje por email.
                        </p>

                        <div className="flex gap-3">
                            <button
                                onClick={() => { setRejectTarget(null); setRejectReason(DEFAULT_REJECTION_TEXT); }}
                                className="flex-1 py-2.5 rounded-xl border border-[#E6E8EC] text-slate-600 hover:bg-[#F8FAFC] text-sm font-medium transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleRejectConfirm}
                                disabled={!!processingId}
                                className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold text-sm transition-colors disabled:opacity-50 shadow-[0_4px_12px_rgba(239,68,68,0.25)]"
                            >
                                {processingId ? 'Enviando...' : 'Confirmar rechazo'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
