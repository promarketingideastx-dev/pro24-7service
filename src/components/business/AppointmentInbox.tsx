'use client';

import { useState, useEffect, useRef } from 'react';
import { Appointment, AppointmentService, AppointmentStatus } from '@/services/appointment.service';
import { BusinessNotificationService } from '@/services/businessNotification.service';
import { format } from 'date-fns';
import { es, enUS, ptBR } from 'date-fns/locale';
import { Calendar, Clock, CheckCircle, XCircle, AlertCircle, User, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useAppointmentRefresh } from '@/context/AppointmentRefreshContext';
import { useTranslations, useLocale } from 'next-intl';

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
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const { triggerRefresh } = useAppointmentRefresh();

    // ── Rejection modal state ─────────────────────────────────────────────────
    const [rejectTarget, setRejectTarget] = useState<Appointment | null>(null);
    const [rejectReason, setRejectReason] = useState(DEFAULT_REJECTION_TEXT);
    const MAX_CHARS = 250;

    // ── Sound ─────────────────────────────────────────────────────────────────
    const audioRef = useRef<HTMLAudioElement | null>(null);
    useEffect(() => {
        audioRef.current = new Audio('/sounds/notification.mp3');
        audioRef.current.volume = 0.6;
    }, []);

    const playSound = () => {
        try { audioRef.current?.play(); } catch { /* silent */ }
    };

    // ── Fetch ─────────────────────────────────────────────────────────────────
    const fetchAppointments = async () => {
        setLoading(true);
        try {
            let data: Appointment[] = [];

            if (activeTab === 'pending') {
                data = await AppointmentService.getAppointmentsByStatus(businessId, 'pending');
            } else if (activeTab === 'upcoming') {
                data = await AppointmentService.getAppointmentsByStatus(businessId, 'confirmed');
                const now = new Date();
                data = data.filter(a => a.date.toDate() >= now);
            } else {
                const cancelled = await AppointmentService.getAppointmentsByStatus(businessId, 'cancelled');
                const completed = await AppointmentService.getAppointmentsByStatus(businessId, 'completed');
                const noshow = await AppointmentService.getAppointmentsByStatus(businessId, 'no-show');
                const confirmed = await AppointmentService.getAppointmentsByStatus(businessId, 'confirmed');
                const now = new Date();
                const pastConfirmed = confirmed.filter(a => a.date.toDate() < now);
                data = [...cancelled, ...completed, ...noshow, ...pastConfirmed];
            }

            data.sort((a, b) => {
                const dateA = a.date.toDate().getTime();
                const dateB = b.date.toDate().getTime();
                return activeTab === 'history' ? dateB - dateA : dateA - dateB;
            });

            setAppointments(data);
        } catch (error) {
            console.error('Error fetching inbox:', error);
            toast.error(t('loadError'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (businessId) fetchAppointments();
    }, [businessId, activeTab]);

    // ── Helpers ────────────────────────────────────────────────────────────────
    const fmtDate = (apt: Appointment) =>
        format(apt.date.toDate(), 'PPP p', { locale: dateFnsLocale });

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
            body: JSON.stringify({ customerUid, title, body, url: '/es/user/profile' }),
        }).catch(() => { });
    };

    // ── Accept ────────────────────────────────────────────────────────────────
    const handleAccept = async (apt: Appointment) => {
        if (!apt.id) return;
        setProcessingId(apt.id);
        try {
            await AppointmentService.updateStatus(apt.id, 'confirmed');

            setAppointments(prev => prev.map(a => a.id === apt.id ? { ...a, status: 'confirmed' } : a));
            toast.success(t('statusAccepted'));
            triggerRefresh();
            fetchAppointments();

            // Notify business (in-app)
            await BusinessNotificationService.create(businessId, {
                type: 'appointment_confirmed',
                title: `✅ Cita confirmada: ${apt.customerName}`,
                body: `${apt.serviceName} · ${fmtDate(apt)}`,
                relatedId: apt.id,
                relatedName: apt.customerName,
            });

            // Email to client
            if (apt.customerEmail) {
                sendEmailFf('appointment_confirmed', apt.customerEmail, {
                    clientName: apt.customerName,
                    businessName: businessName || 'el negocio',
                    serviceName: apt.serviceName,
                    dateLabel: fmtDate(apt),
                    businessPhone,
                });
            }

            // Push notification to client (if they have FCM token)
            sendPushToClient(
                apt.customerUid,
                '✅ Cita confirmada',
                `Tu cita de ${apt.serviceName} con ${businessName || 'el negocio'} fue confirmada.`
            );
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
            await AppointmentService.updateStatus(rejectTarget.id, 'cancelled', rejectReason);

            setAppointments(prev => prev.map(a => a.id === rejectTarget.id ? { ...a, status: 'cancelled' } : a));
            toast.success(t('statusRejected'));
            triggerRefresh();
            fetchAppointments();

            // Email to client
            if (rejectTarget.customerEmail) {
                sendEmailFf('appointment_rejected', rejectTarget.customerEmail, {
                    clientName: rejectTarget.customerName,
                    businessName: businessName || 'el negocio',
                    serviceName: rejectTarget.serviceName,
                    reason: rejectReason,
                    businessPhone,
                });
            }

            // Push notification to client
            sendPushToClient(
                rejectTarget.customerUid,
                '📋 Actualización de cita',
                `Tu solicitud de ${rejectTarget.serviceName} con ${businessName || 'el negocio'} no pudo ser confirmada.`
            );

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
        cancelled: 'border-red-300 text-red-600 bg-red-50',
        'no-show': 'border-slate-300 text-slate-500 bg-slate-50',
    };

    // Left-border accent per status (appointment card)
    const statusBorderLeft: Record<string, string> = {
        pending: 'border-l-4 border-l-amber-400',
        confirmed: 'border-l-4 border-l-[#14B8A6]',
        completed: 'border-l-4 border-l-green-400',
        cancelled: 'border-l-4 border-l-red-400',
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
                <div className="p-4 min-h-[300px] bg-[#F8FAFC]">
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
                                    className={`bg-white border border-[#E6E8EC] rounded-xl p-4 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] transition-all ${statusBorderLeft[apt.status] ?? 'border-l-4 border-l-slate-200'}`}
                                >
                                    {/* Status icon */}
                                    <div className="flex items-start gap-4">
                                        <div className={`p-2.5 rounded-xl shrink-0 ${apt.status === 'confirmed' ? 'bg-[rgba(20,184,166,0.10)] text-[#14B8A6]' :
                                            apt.status === 'pending' ? 'bg-amber-50 text-amber-500' :
                                                apt.status === 'completed' ? 'bg-green-50 text-green-500' :
                                                    apt.status === 'cancelled' ? 'bg-red-50 text-red-500' :
                                                        'bg-slate-100 text-slate-400'
                                            }`}>
                                            <User size={18} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-900 text-base">{apt.customerName}</h4>
                                            <div className="flex flex-col gap-1 mt-1 text-sm text-slate-500">
                                                <div className="flex items-center gap-2">
                                                    <Calendar size={13} className="text-[#14B8A6]" />
                                                    <span>{format(apt.date.toDate(), 'PPP', { locale: dateFnsLocale })}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Clock size={13} className="text-[#2563EB]" />
                                                    <span>{format(apt.date.toDate(), 'p', { locale: dateFnsLocale })}</span>
                                                    <span className="text-slate-300">•</span>
                                                    <span className="text-slate-700 font-medium">{apt.serviceName}</span>
                                                </div>
                                                {apt.notes && (
                                                    <div className="flex items-start gap-2 mt-1 px-2 py-1.5 bg-[#F8FAFC] border border-[#E6E8EC] rounded-lg text-xs italic text-slate-500">
                                                        <MessageCircle size={11} className="mt-0.5 shrink-0 text-slate-400" />
                                                        "{apt.notes}"
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
                                            {apt.status === 'cancelled' && <><XCircle size={11} />    {t('badgeCancelled')}</>}
                                            {apt.status === 'completed' && <><CheckCircle size={11} /> {t('badgeCompleted')}</>}
                                            {apt.status === 'no-show' && <><XCircle size={11} />    {t('badgeNoShow')}</>}
                                            {apt.status === 'pending' && <><AlertCircle size={11} /> {t('badgePending')}</>}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

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
                                <strong>{rejectTarget.customerName}</strong>
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
