'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useAdminContext } from '@/context/AdminContext';
import { DisputeService, STATUS_META, PRIORITY_META, CATEGORY_LABELS } from '@/services/dispute.service';
import { AdminNotificationService } from '@/services/adminNotification.service';
import type { DisputeDocument, DisputeMessage, DisputeStatus } from '@/types/admin-notifications';
import {
    Scale, ChevronRight, X, Send, User, Shield, Clock,
    AlertTriangle, CheckCircle, XCircle, MessageSquare,
    Filter, RefreshCw
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

const STATUS_FILTERS: { key: DisputeStatus | 'all'; label: string }[] = [
    { key: 'all', label: 'Todos' },
    { key: 'open', label: 'Abiertos' },
    { key: 'in_progress', label: 'En Proceso' },
    { key: 'resolved', label: 'Resueltos' },
    { key: 'closed', label: 'Cerrados' },
];

function relTime(ts: any) {
    if (!ts?.toDate) return '';
    try { return formatDistanceToNow(ts.toDate(), { addSuffix: true, locale: es }); } catch { return ''; }
}

function fmtDate(ts: any) {
    if (!ts?.toDate) return '';
    try { return format(ts.toDate(), 'dd MMM, HH:mm', { locale: es }); } catch { return ''; }
}

// ── Conversation Panel ────────────────────────────────────────────────────────
function DisputePanel({ dispute, onClose }: { dispute: DisputeDocument; onClose: () => void }) {
    const [messages, setMessages] = useState<DisputeMessage[]>([]);
    const [reply, setReply] = useState('');
    const [sending, setSending] = useState(false);
    const [resolution, setResolution] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        DisputeService.markRead(dispute.id);
        const unsub = DisputeService.onMessages(dispute.id, msgs => {
            setMessages(msgs);
            setTimeout(() => scrollRef.current?.scrollTo({ top: 99999, behavior: 'smooth' }), 100);
        });
        return () => unsub();
    }, [dispute.id]);

    const sendReply = async () => {
        if (!reply.trim()) return;
        setSending(true);
        try {
            await DisputeService.addReply(dispute.id, 'admin', 'Admin PRO24/7', reply.trim());
            setReply('');
            toast.success('Respuesta enviada');
        } catch { toast.error('Error al enviar'); }
        finally { setSending(false); }
    };

    const changeStatus = async (status: DisputeStatus) => {
        await DisputeService.updateStatus(dispute.id, status, resolution || undefined);
        toast.success(`Disputa marcada como ${STATUS_META[status].label}`);
    };

    const sm = STATUS_META[dispute.status];
    const pm = PRIORITY_META[dispute.priority];

    return (
        <div className="fixed inset-0 z-[2000] flex">
            {/* Backdrop */}
            <div className="flex-1 bg-black/50" onClick={onClose} />

            {/* Panel */}
            <div className="w-full max-w-xl bg-[#0a1128] border-l border-white/10 flex flex-col shadow-2xl">
                {/* Header */}
                <div className="flex items-start justify-between p-4 border-b border-white/5 shrink-0">
                    <div className="flex-1 min-w-0">
                        <p className="text-white font-bold truncate">{dispute.title}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${sm.color} ${sm.bg} ${sm.border}`}>
                                {sm.label}
                            </span>
                            <span className={`text-[10px] font-semibold ${pm.color}`}>{pm.label}</span>
                            <span className="text-[10px] text-slate-500">{CATEGORY_LABELS[dispute.category] ?? dispute.category}</span>
                            {dispute.country && <span className="text-[10px] text-slate-600">· {dispute.country}</span>}
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white p-1 ml-2 shrink-0">
                        <X size={18} />
                    </button>
                </div>

                {/* Reporter info */}
                <div className="px-4 py-3 bg-white/3 border-b border-white/5 shrink-0 flex items-center gap-3 text-xs text-slate-400">
                    <User size={13} />
                    <span className="font-medium text-white">{dispute.reporterName}</span>
                    {dispute.reporterEmail && <span>{dispute.reporterEmail}</span>}
                    <span className="ml-auto">{relTime(dispute.createdAt)}</span>
                </div>

                {/* Description (initial) */}
                <div className="px-4 py-3 bg-[#0d1526] border-b border-white/5 shrink-0">
                    <p className="text-sm text-slate-300 leading-relaxed">{dispute.description}</p>
                </div>

                {/* Messages */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                    {messages.length === 0 ? (
                        <p className="text-slate-600 text-xs text-center py-4">Sin respuestas aún</p>
                    ) : (
                        messages.map(msg => {
                            const isAdmin = msg.authorRole === 'admin';
                            return (
                                <div key={msg.id} className={`flex gap-2 ${isAdmin ? 'flex-row-reverse' : ''}`}>
                                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs ${isAdmin ? 'bg-brand-neon-cyan/20 text-brand-neon-cyan' : 'bg-white/10 text-slate-400'}`}>
                                        {isAdmin ? <Shield size={12} /> : <User size={12} />}
                                    </div>
                                    <div className={`max-w-[80%] ${isAdmin ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                                        <div className={`px-3 py-2 rounded-xl text-sm ${isAdmin
                                            ? 'bg-brand-neon-cyan/10 border border-brand-neon-cyan/20 text-white'
                                            : 'bg-white/5 border border-white/10 text-slate-300'
                                            }`}>
                                            {msg.body}
                                        </div>
                                        <span className="text-[9px] text-slate-600 px-1">{fmtDate(msg.createdAt)}</span>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Reply box */}
                <div className="p-3 border-t border-white/5 shrink-0">
                    <div className="flex gap-2">
                        <textarea
                            value={reply}
                            onChange={e => setReply(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply(); } }}
                            rows={2}
                            placeholder="Escribe una respuesta..."
                            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white resize-none focus:outline-none focus:border-brand-neon-cyan/50"
                        />
                        <button onClick={sendReply} disabled={sending || !reply.trim()}
                            className="px-3 bg-brand-neon-cyan text-black rounded-xl font-bold hover:opacity-90 disabled:opacity-30 transition-all">
                            <Send size={15} />
                        </button>
                    </div>
                </div>

                {/* Status actions */}
                {dispute.status !== 'closed' && (
                    <div className="p-3 border-t border-white/5 shrink-0 space-y-2">
                        {(dispute.status === 'open' || dispute.status === 'in_progress') && (
                            <input
                                value={resolution}
                                onChange={e => setResolution(e.target.value)}
                                placeholder="Nota de resolución (opcional)"
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-white/20"
                            />
                        )}
                        <div className="flex gap-2">
                            {dispute.status === 'open' && (
                                <button onClick={() => changeStatus('in_progress')}
                                    className="flex-1 py-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold rounded-xl hover:bg-amber-500/20 transition-colors">
                                    En Proceso
                                </button>
                            )}
                            {(dispute.status === 'open' || dispute.status === 'in_progress') && (
                                <button onClick={() => changeStatus('resolved')}
                                    className="flex-1 py-2 bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-bold rounded-xl hover:bg-green-500/20 transition-colors">
                                    <CheckCircle size={12} className="inline mr-1" />Resolver
                                </button>
                            )}
                            <button onClick={() => changeStatus('closed')}
                                className="py-2 px-3 bg-white/5 border border-white/10 text-slate-400 text-xs rounded-xl hover:bg-white/10 transition-colors">
                                <XCircle size={13} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function AdminDisputesPage() {
    const { selectedCountry } = useAdminContext();
    const t = useTranslations('admin.disputes');
    const tc = useTranslations('admin.common');

    const STATUS_FILTERS_L = [
        { key: 'all' as const, label: tc('all') },
        { key: 'open' as const, label: t('openTab') },
        { key: 'in_progress' as const, label: t('inProgress') },
        { key: 'resolved' as const, label: t('resolved_tab') },
        { key: 'closed' as const, label: t('closedTab') },
    ];

    const [disputes, setDisputes] = useState<DisputeDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<DisputeStatus | 'all'>('all');
    const [selected, setSelected] = useState<DisputeDocument | null>(null);

    useEffect(() => {
        const unsub = DisputeService.onDisputes({ country: selectedCountry }, (d) => {
            setDisputes(d);
            setLoading(false);
        });
        return () => unsub();
    }, [selectedCountry]);

    const displayed = statusFilter === 'all' ? disputes : disputes.filter(d => d.status === statusFilter);

    const counts: Record<string, number> = {};
    STATUS_FILTERS_L.forEach(f => {
        counts[f.key] = f.key === 'all' ? disputes.length : disputes.filter(d => d.status === f.key).length;
    });

    return (
        <>
            <div className="space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                        <h1 className="text-xl font-bold text-white flex items-center gap-2">
                            <Scale size={20} className="text-brand-neon-cyan" />
                            {t('support')}
                        </h1>
                        <p className="text-xs text-slate-500 mt-0.5">{disputes.length} {t('totalTickets')}</p>
                    </div>

                    {/* Status filters */}
                    <div className="flex gap-1.5 flex-wrap">
                        {STATUS_FILTERS_L.map(f => {
                            const sm = f.key !== 'all' ? STATUS_META[f.key as DisputeStatus] : null;
                            return (
                                <button key={f.key} onClick={() => setStatusFilter(f.key as any)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${statusFilter === f.key
                                        ? 'bg-white/10 border-white/20 text-white'
                                        : 'bg-white/3 border-white/8 text-slate-400 hover:text-white'
                                        }`}>
                                    {sm && <span className={`w-1.5 h-1.5 rounded-full ${sm.color.replace('text-', 'bg-')}`} />}
                                    {f.label}
                                    <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded-full">{counts[f.key] ?? 0}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white/2 border border-white/8 rounded-2xl overflow-hidden">
                    {loading ? (
                        <div className="p-8 text-center">
                            <div className="w-6 h-6 border-2 border-white/10 border-t-brand-neon-cyan rounded-full animate-spin mx-auto" />
                        </div>
                    ) : displayed.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-3">
                            <Scale size={36} className="opacity-20" />
                            <p className="text-sm">{t('noDisputes')}</p>
                        </div>
                    ) : (
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-white/5">
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('ticket')}</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">{t('category')}</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">{t('reportedBy')}</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{tc('active')}</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">{t('since')}</th>
                                    <th className="px-4 py-3" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {displayed.map(d => {
                                    const sm = STATUS_META[d.status];
                                    const pm = PRIORITY_META[d.priority];
                                    return (
                                        <tr key={d.id}
                                            onClick={() => setSelected(d)}
                                            className={`cursor-pointer hover:bg-white/3 transition-colors ${d.unreadByAdmin ? 'bg-brand-neon-cyan/3' : ''}`}>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    {d.unreadByAdmin && <span className="w-1.5 h-1.5 rounded-full bg-brand-neon-cyan shrink-0" />}
                                                    <div>
                                                        <p className="font-medium text-white truncate max-w-[200px]">{d.title}</p>
                                                        <p className={`text-[10px] font-semibold ${pm.color}`}>{pm.label}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-slate-400 text-xs hidden md:table-cell">
                                                {CATEGORY_LABELS[d.category] ?? d.category}
                                            </td>
                                            <td className="px-4 py-3 hidden lg:table-cell">
                                                <p className="text-white text-xs">{d.reporterName}</p>
                                                <p className="text-slate-600 text-[10px]">{d.country ?? ''}</p>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${sm.color} ${sm.bg} ${sm.border}`}>
                                                    {sm.label}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-[11px] text-slate-500 hidden md:table-cell">
                                                {relTime(d.createdAt)}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2 justify-end">
                                                    {d.messageCount > 0 && (
                                                        <span className="flex items-center gap-1 text-[10px] text-slate-500">
                                                            <MessageSquare size={10} />{d.messageCount}
                                                        </span>
                                                    )}
                                                    <ChevronRight size={14} className="text-slate-600" />
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Side panel */}
            {selected && (
                <DisputePanel
                    dispute={selected}
                    onClose={() => setSelected(null)}
                />
            )}
        </>
    );
}
