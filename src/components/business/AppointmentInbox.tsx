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

    return (
        <>
            <div className="bg-slate-500 border border-slate-200 rounded-2xl overflow-hidden backdrop-blur-sm">
                {/* Tabs */}
                <div className="flex border-b border-slate-200">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-medium transition-colors relative
                                ${activeTab === tab.id ? 'text-white bg-slate-50' : 'text-slate-400 hover:text-slate-800 hover:bg-slate-50'}
                            `}
                        >
                            {tab.icon}
                            {tab.label}
                            {activeTab === tab.id && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-neon-cyan shadow-[0_0_10px_rgba(0,240,255,0.5)]" />
                            )}
                        </button>
                    ))}
                </div>

                {/* List */}
                <div className="p-4 min-h-[300px]">
                    {loading ? (
                        <div className="flex justify-center items-center h-48 text-slate-500 animate-pulse">
                            {t('loading')}
                        </div>
                    ) : appointments.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-48 text-slate-500">
                            <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mb-3">
                                <Clock size={20} className="text-slate-600" />
                            </div>
                            <p>{t('empty')}</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {appointments.map((apt) => (
                                <div
                                    key={apt.id}
                                    className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center hover:bg-slate-100 transition-colors"
                                >
                                    {/* Info */}
                                    <div className="flex items-start gap-4">
                                        <div className={`p-3 rounded-full ${apt.status === 'confirmed' ? 'bg-green-500/10 text-green-500' :
                                            apt.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500' :
                                                'bg-slate-500/10 text-slate-500'
                                            }`}>
                                            <User size={20} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-white text-lg">{apt.customerName}</h4>
                                            <div className="flex flex-col gap-1 mt-1 text-sm text-slate-400">
                                                <div className="flex items-center gap-2">
                                                    <Calendar size={14} className="text-brand-neon-cyan" />
                                                    <span className="text-slate-300">
                                                        {format(apt.date.toDate(), 'PPP', { locale: dateFnsLocale })}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Clock size={14} className="text-purple-400" />
                                                    <span>
                                                        {format(apt.date.toDate(), 'p', { locale: dateFnsLocale })}
                                                    </span>
                                                    <span className="text-slate-600">•</span>
                                                    <span className="text-white font-medium">{apt.serviceName}</span>
                                                </div>
                                                {apt.notes && (
                                                    <div className="flex items-start gap-2 mt-1 px-2 py-1 bg-black/20 rounded text-xs italic">
                                                        <MessageCircle size={12} className="mt-0.5 shrink-0" />
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
                                                onClick={() => {
                                                    setRejectTarget(apt);
                                                    setRejectReason(DEFAULT_REJECTION_TEXT);
                                                }}
                                                disabled={!!processingId}
                                                className="flex-1 md:flex-none px-4 py-2 rounded-lg border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                                            >
                                                {t('reject')}
                                            </button>
                                            <button
                                                onClick={() => handleAccept(apt)}
                                                disabled={!!processingId}
                                                className="flex-1 md:flex-none px-4 py-2 rounded-lg bg-green-500 text-black font-bold hover:shadow-[0_0_15px_rgba(34,197,94,0.4)] transition-all disabled:opacity-50"
                                            >
                                                {processingId === apt.id ? '...' : t('accept')}
                                            </button>
                                        </div>
                                    )}

                                    {/* Status badge (other tabs) */}
                                    {activeTab !== 'pending' && (
                                        <div className={`shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${apt.status === 'confirmed'
                                            ? 'border-green-500/30 text-green-400 bg-green-500/5'
                                            : apt.status === 'cancelled'
                                                ? 'border-red-500/30 text-red-400 bg-red-500/5'
                                                : apt.status === 'completed'
                                                    ? 'border-slate-500/30 text-slate-300 bg-slate-500/5'
                                                    : apt.status === 'no-show'
                                                        ? 'border-slate-600/30 text-slate-500 bg-slate-600/5'
                                                        : 'border-yellow-500/30 text-yellow-400 bg-yellow-500/5'
                                            }`}>
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
                    <div className="bg-[#131929] border border-slate-200 rounded-2xl p-6 w-full max-w-md shadow-2xl">
                        <h3 className="text-white font-bold text-lg mb-1">
                            ❌ Rechazar cita
                        </h3>
                        <p className="text-slate-400 text-sm mb-4">
                            <strong className="text-slate-200">{rejectTarget.customerName}</strong>
                            {' · '}{rejectTarget.serviceName} · {fmtDate(rejectTarget)}
                        </p>

                        <label className="block text-xs text-slate-500 mb-2 uppercase tracking-wider">
                            Motivo (se enviará al cliente por email)
                        </label>
                        <textarea
                            value={rejectReason}
                            onChange={e => setRejectReason(e.target.value.slice(0, MAX_CHARS))}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-white text-sm outline-none focus:border-red-400/40 resize-none h-32 leading-relaxed"
                        />
                        <p className={`text-right text-xs mt-1 ${rejectReason.length >= MAX_CHARS ? 'text-red-400' : 'text-slate-600'}`}>
                            {rejectReason.length}/{MAX_CHARS}
                        </p>

                        <p className="text-xs text-slate-600 mt-1 mb-4 italic">
                            Puedes editar el texto antes de enviar. El cliente recibirá este mensaje por email.
                        </p>

                        <div className="flex gap-3">
                            <button
                                onClick={() => { setRejectTarget(null); setRejectReason(DEFAULT_REJECTION_TEXT); }}
                                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-400 hover:text-slate-800 text-sm transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleRejectConfirm}
                                disabled={!!processingId}
                                className="flex-1 py-2.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 font-semibold text-sm transition-colors disabled:opacity-50"
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
