'use client';

import { useState, useEffect } from 'react';
import { useAdminContext } from '@/context/AdminContext';
import { AuditLogService, AUDIT_ACTION_LABELS, AUDIT_ACTION_EMOJI, AuditEntry, AuditAction } from '@/services/auditLog.service';
import { BookOpen, Shield, Filter, ChevronDown } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { es } from 'date-fns/locale';

const ACTION_TYPES = [
    { key: 'all', label: 'Todas las acciones' },
    { key: 'business', label: 'Negocios' },
    { key: 'user', label: 'Usuarios' },
    { key: 'dispute', label: 'Disputas' },
    { key: 'admin', label: 'Admin' },
];

function relTime(ts: any) {
    if (!ts?.toDate) return '—';
    try { return formatDistanceToNow(ts.toDate(), { addSuffix: true, locale: es }); } catch { return '—'; }
}

function fmtDate(ts: any) {
    if (!ts?.toDate) return '—';
    try { return format(ts.toDate(), 'dd/MM/yyyy HH:mm:ss'); } catch { return '—'; }
}

export default function AuditLogPage() {
    const { selectedCountry } = useAdminContext();
    const [entries, setEntries] = useState<AuditEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [typeFilter, setTypeFilter] = useState<string>('all');
    const [expanded, setExpanded] = useState<string | null>(null);

    useEffect(() => {
        const unsub = AuditLogService.onEntries(
            { country: selectedCountry, limitN: 300 },
            (data) => { setEntries(data); setLoading(false); }
        );
        return () => unsub();
    }, [selectedCountry]);

    const displayed = typeFilter === 'all'
        ? entries
        : entries.filter(e => e.action.startsWith(typeFilter));

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-xl font-bold text-white flex items-center gap-2">
                        <BookOpen size={20} className="text-brand-neon-cyan" />
                        Audit Log
                    </h1>
                    <p className="text-xs text-slate-500 mt-0.5">
                        Registro inmutable de acciones administrativas · {displayed.length} entradas
                    </p>
                </div>
                <div className="flex gap-1.5 flex-wrap">
                    {ACTION_TYPES.map(t => (
                        <button key={t.key} onClick={() => setTypeFilter(t.key)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${typeFilter === t.key
                                ? 'bg-white/10 border-white/20 text-white'
                                : 'bg-white/3 border-white/8 text-slate-400 hover:text-white'
                                }`}>
                            {t.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Table */}
            <div className="bg-white/2 border border-white/8 rounded-2xl overflow-hidden">
                {loading ? (
                    <div className="p-12 flex justify-center">
                        <div className="w-6 h-6 border-2 border-white/10 border-t-brand-neon-cyan rounded-full animate-spin" />
                    </div>
                ) : displayed.length === 0 ? (
                    <div className="flex flex-col items-center py-20 gap-3 text-slate-500">
                        <BookOpen size={36} className="opacity-20" />
                        <p className="text-sm">No hay entradas en el audit log aún.</p>
                        <p className="text-xs text-slate-600">Las acciones admin se registrarán automáticamente aquí.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-white/5">
                        {displayed.map(entry => {
                            const emoji = AUDIT_ACTION_EMOJI[entry.action as AuditAction] ?? '📋';
                            const label = AUDIT_ACTION_LABELS[entry.action as AuditAction] ?? entry.action;
                            const isExpanded = expanded === entry.id;
                            const hasDiff = entry.before || entry.after || entry.meta;

                            return (
                                <div key={entry.id}
                                    className={`transition-colors ${hasDiff ? 'cursor-pointer hover:bg-white/3' : ''}`}
                                    onClick={() => hasDiff && setExpanded(isExpanded ? null : entry.id)}>
                                    <div className="flex items-start gap-3 px-4 py-3">
                                        {/* Emoji */}
                                        <span className="text-lg shrink-0 mt-0.5">{emoji}</span>

                                        {/* Main info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="text-white text-sm font-semibold">{label}</span>
                                                    {entry.targetName && (
                                                        <span className="text-brand-neon-cyan text-xs bg-brand-neon-cyan/10 px-2 py-0.5 rounded-full">
                                                            {entry.targetName}
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="text-[10px] text-slate-600 shrink-0 whitespace-nowrap">{relTime(entry.createdAt)}</span>
                                            </div>
                                            <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                                                <span className="flex items-center gap-1 text-[11px] text-slate-500">
                                                    <Shield size={10} className="text-brand-neon-cyan" />
                                                    {entry.actorName}
                                                </span>
                                                {entry.country && <span className="text-[10px] text-slate-700">{entry.country}</span>}
                                                <span className="text-[10px] text-slate-700 font-mono">{fmtDate(entry.createdAt)}</span>
                                            </div>
                                        </div>

                                        {hasDiff && (
                                            <ChevronDown size={14} className={`text-slate-500 shrink-0 mt-1 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                        )}
                                    </div>

                                    {/* Expanded diff view */}
                                    {isExpanded && hasDiff && (
                                        <div className="px-12 pb-3 space-y-2">
                                            {entry.before && (
                                                <div className="bg-red-500/5 border border-red-500/10 rounded-lg p-3">
                                                    <p className="text-[10px] text-red-400 font-bold mb-1 uppercase tracking-wider">Antes</p>
                                                    <pre className="text-[11px] text-slate-300 overflow-x-auto whitespace-pre-wrap">
                                                        {JSON.stringify(entry.before, null, 2)}
                                                    </pre>
                                                </div>
                                            )}
                                            {entry.after && (
                                                <div className="bg-green-500/5 border border-green-500/10 rounded-lg p-3">
                                                    <p className="text-[10px] text-green-400 font-bold mb-1 uppercase tracking-wider">Después</p>
                                                    <pre className="text-[11px] text-slate-300 overflow-x-auto whitespace-pre-wrap">
                                                        {JSON.stringify(entry.after, null, 2)}
                                                    </pre>
                                                </div>
                                            )}
                                            {entry.meta && (
                                                <div className="bg-white/3 border border-white/8 rounded-lg p-3">
                                                    <p className="text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-wider">Contexto</p>
                                                    <pre className="text-[11px] text-slate-400 overflow-x-auto whitespace-pre-wrap">
                                                        {JSON.stringify(entry.meta, null, 2)}
                                                    </pre>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
