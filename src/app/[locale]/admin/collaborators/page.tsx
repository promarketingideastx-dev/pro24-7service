'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useAdminContext } from '@/context/AdminContext';
import { useAuth } from '@/context/AuthContext';
import {
    onSnapshot, query, collection, where, orderBy,
    doc, updateDoc, deleteDoc, serverTimestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { AuditLogService } from '@/services/auditLog.service';
import { AdminNotificationService } from '@/services/adminNotification.service';
import {
    Crown, Play, Pause, XCircle, Trash2, Search,
    Globe, User, Calendar, ChevronDown, Filter
} from 'lucide-react';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────

type CollabStatus = 'active' | 'paused' | 'inactive' | string;

interface CollabRow {
    id: string;
    brandName: string;
    ownerUid: string;
    ownerEmail?: string;
    ownerName?: string;
    ownerLocale?: string;
    country: string;
    category: string;
    planStatus: CollabStatus;
    createdAt: any;
    requestNote?: string;
    collaboratorData?: Record<string, any>;
}

// ─── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status, t }: { status: CollabStatus; t: any }) {
    const styles: Record<string, string> = {
        active: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
        paused: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
        inactive: 'bg-red-500/15 text-red-400 border-red-500/25',
    };
    const labels: Record<string, string> = {
        active: t('statusActive'),
        paused: t('statusPaused'),
        inactive: t('statusInactive'),
    };
    return (
        <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full border ${styles[status] ?? 'bg-slate-500/15 text-slate-400 border-slate-500/25'}`}>
            {labels[status] ?? status}
        </span>
    );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function CollaboratorsPage() {
    const t = useTranslations('collaborators');
    const { selectedCountry } = useAdminContext();
    const { user } = useAuth();

    const [rows, setRows] = useState<CollabRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | CollabStatus>('all');
    const [busyId, setBusyId] = useState<string | null>(null);
    const [pauseDialog, setPauseDialog] = useState<{ id: string; name: string; row?: CollabRow } | null>(null);
    const [pauseReason, setPauseReason] = useState('');

    // ── Realtime listener ────────────────────────────────────────────────────
    useEffect(() => {
        const q = query(
            collection(db, 'businesses_public'),
            where('planData.planSource', '==', 'collaborator_beta'),
            orderBy('createdAt', 'desc')
        );

        const unsub = onSnapshot(q, (snap) => {
            const data: CollabRow[] = snap.docs.map(d => {
                const r = d.data();
                return {
                    id: d.id,
                    brandName: r.brandName ?? r.businessName ?? '—',
                    ownerUid: r.ownerUid ?? '',
                    ownerEmail: r.ownerEmail ?? r.email ?? '',
                    ownerName: r.ownerName ?? r.brandName ?? r.businessName ?? 'Colaborador',
                    ownerLocale: r.locale ?? r.ownerLocale ?? 'es',
                    country: r.country ?? r.countryCode ?? '—',
                    category: r.category ?? r.categories?.main ?? '—',
                    planStatus: r.planData?.planStatus ?? 'active',
                    createdAt: r.createdAt,
                    requestNote: r.collaboratorData?.requestNote,
                    collaboratorData: r.collaboratorData,
                };
            });
            setRows(data);
            setLoading(false);
        }, () => setLoading(false));

        return () => unsub();
    }, []);

    // ── Filters ──────────────────────────────────────────────────────────────
    const filtered = rows.filter(r => {
        const matchCountry = !selectedCountry || r.country === selectedCountry;
        const matchStatus = statusFilter === 'all' || r.planStatus === statusFilter;
        const term = search.toLowerCase();
        const matchSearch = !term ||
            r.brandName.toLowerCase().includes(term) ||
            (r.ownerEmail ?? '').toLowerCase().includes(term) ||
            r.country.toLowerCase().includes(term);
        return matchCountry && matchStatus && matchSearch;
    });

    // ── Actions ──────────────────────────────────────────────────────────────
    const updateStatus = async (
        id: string,
        name: string,
        planStatus: CollabStatus,
        extra: Record<string, any> = {},
        row?: CollabRow
    ) => {
        setBusyId(id);
        try {
            await updateDoc(doc(db, 'businesses_public', id), {
                'planData.planStatus': planStatus,
                [`collaboratorData.${planStatus === 'active' ? 'activatedAt' : planStatus === 'paused' ? 'pausedAt' : 'deactivatedAt'}`]: serverTimestamp(),
                [`collaboratorData.${planStatus === 'active' ? 'activatedBy' : planStatus === 'paused' ? 'pausedBy' : 'deactivatedBy'}`]: user?.uid ?? 'admin',
                'collaboratorData.lastActionAt': serverTimestamp(),
                'collaboratorData.lastActionBy': user?.uid ?? 'admin',
                ...extra,
            });

            // ── Email notification to collaborator ───────────────────────────
            if (row?.ownerEmail && (planStatus === 'active' || planStatus === 'paused')) {
                fetch('/api/welcome-email', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: planStatus === 'active' ? 'plan_activated' : 'plan_paused',
                        email: row.ownerEmail,
                        name: row.ownerName ?? name,
                        locale: row.ownerLocale ?? 'es',
                        data: {
                            businessName: name,
                            category: row.category,
                            plan: 'vip',
                            reason: extra['collaboratorData.pauseReason'] ?? '',
                        },
                    }),
                }).catch(() => { /* silent — non-critical */ });
            }

            // ── Audit log ────────────────────────────────────────────────────
            await AuditLogService.log({
                action: `collaborator.${planStatus === 'active' ? 'activated' : planStatus === 'paused' ? 'paused' : 'deactivated'}`,
                actorUid: user?.uid ?? 'admin',
                actorName: user?.email ?? 'admin',
                targetId: id,
                targetName: name,
                targetType: 'business',
                meta: extra['collaboratorData.pauseReason'] ? { reason: extra['collaboratorData.pauseReason'] } : undefined,
            }).catch(() => { });

            // ── Admin notification ───────────────────────────────────────────
            if (planStatus === 'active') {
                AdminNotificationService.create({
                    type: 'collaborator_activated',
                    title: `👑 Colaborador activado: ${name}`,
                    body: `Plan VIP activado para ${name}`,
                    relatedId: id,
                    relatedName: name,
                }).catch(() => { });
            } else if (planStatus === 'paused') {
                AdminNotificationService.create({
                    type: 'collaborator_paused',
                    title: `⏸️ Colaborador pausado: ${name}`,
                    body: extra['collaboratorData.pauseReason'] ?? 'Sin motivo especificado',
                    relatedId: id,
                    relatedName: name,
                }).catch(() => { });
            }

            toast.success(t(`${planStatus === 'active' ? 'activateSuccess' : planStatus === 'paused' ? 'pauseSuccess' : 'deactivateSuccess'}`));
        } catch {
            toast.error('Error al actualizar la cuenta');
        } finally {
            setBusyId(null);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(t('confirmDelete'))) return;
        setBusyId(id);
        try {
            await deleteDoc(doc(db, 'businesses_public', id));
            await AuditLogService.log({
                action: 'collaborator.deleted',
                actorUid: user?.uid ?? 'admin',
                actorName: user?.email ?? 'admin',
                targetId: id,
                targetName: name,
                targetType: 'business',
            }).catch(() => { });
            toast.success(t('deleteSuccess'));
        } catch {
            toast.error('Error al eliminar');
        } finally {
            setBusyId(null);
        }
    };

    const handlePauseConfirm = async () => {
        if (!pauseDialog) return;
        await updateStatus(pauseDialog.id, pauseDialog.name, 'paused', {
            'collaboratorData.pauseReason': pauseReason || '',
        }, pauseDialog.row);
        setPauseDialog(null);
        setPauseReason('');
    };

    // ── Pending count badge ──────────────────────────────────────────────────
    const pendingCount = rows.filter(r => r.planStatus === 'active' && !r.collaboratorData?.activatedBy).length;

    // ────────────────────────────────────────────────────────────────────────
    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <Crown className="w-5 h-5 text-amber-400" />
                        <h1 className="text-xl font-bold text-white">{t('title')}</h1>
                        {pendingCount > 0 && (
                            <span className="px-2 py-0.5 text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full">
                                {pendingCount} {t('pending')}
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-slate-500">{t('subtitle')}</p>
                </div>
                <p className="text-sm text-slate-600">{filtered.length} / {rows.length}</p>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Buscar negocio, email, país..."
                        className="w-full pl-9 pr-4 h-10 bg-slate-50 border border-slate-200 rounded-xl text-white text-sm placeholder:text-slate-600 outline-none focus:border-amber-400/40"
                    />
                </div>
                <div className="relative">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value as any)}
                        className="pl-9 pr-8 h-10 bg-slate-50 border border-slate-200 rounded-xl text-white text-sm outline-none focus:border-amber-400/40 appearance-none"
                    >
                        <option value="all">{t('all')}</option>
                        <option value="active">{t('statusActive')}</option>
                        <option value="paused">{t('statusPaused')}</option>
                        <option value="inactive">{t('statusInactive')}</option>
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                </div>
            </div>

            {/* Table */}
            {loading ? (
                <div className="text-center py-20 text-slate-500">Cargando...</div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-20 text-slate-500">
                    <Crown className="w-10 h-10 mx-auto mb-3 opacity-20" />
                    <p>{t('noCollaborators')}</p>
                </div>
            ) : (
                <div className="overflow-x-auto rounded-2xl border border-white/6">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-white/6 bg-white/3 text-slate-500 text-xs uppercase tracking-wider">
                                <th className="px-4 py-3 text-left">{t('business')}</th>
                                <th className="px-4 py-3 text-left">{t('owner')}</th>
                                <th className="px-4 py-3 text-left">{t('country')}</th>
                                <th className="px-4 py-3 text-left">Estado</th>
                                <th className="px-4 py-3 text-left">{t('registered')}</th>
                                <th className="px-4 py-3 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/4">
                            {filtered.map(row => (
                                <tr key={row.id} className="hover:bg-white/3 transition-colors">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                            <span className="font-semibold text-white">{row.brandName}</span>
                                        </div>
                                        {row.requestNote && (
                                            <p className="text-xs text-slate-500 mt-0.5 ml-5 line-clamp-1 italic">"{row.requestNote}"</p>
                                        )}
                                        <p className="text-xs text-slate-600 mt-0.5 ml-5">{row.category}</p>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-1.5 text-slate-300">
                                            <User className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                            <span className="text-xs truncate max-w-[150px]">{row.ownerEmail || row.ownerUid}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-1.5 text-slate-300">
                                            <img
                                                src={`https://flagcdn.com/w20/${row.country.toLowerCase()}.png`}
                                                alt={row.country}
                                                className="w-4 h-3 object-cover rounded-sm"
                                                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                            />
                                            <span className="text-xs">{row.country}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <StatusBadge status={row.planStatus} t={t} />
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-1 text-slate-500 text-xs">
                                            <Calendar className="w-3 h-3" />
                                            {row.createdAt?.toDate
                                                ? row.createdAt.toDate().toLocaleDateString()
                                                : '—'}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center justify-end gap-1">
                                            {/* Activate */}
                                            {row.planStatus !== 'active' && (
                                                <button
                                                    onClick={() => updateStatus(row.id, row.brandName, 'active', {}, row)}
                                                    disabled={busyId === row.id}
                                                    title={t('actionActivate')}
                                                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-emerald-500/10 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/20 transition-all disabled:opacity-40"
                                                >
                                                    <Play className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                            {/* Pause */}
                                            {row.planStatus === 'active' && (
                                                <button
                                                    onClick={() => setPauseDialog({ id: row.id, name: row.brandName, row })}
                                                    disabled={busyId === row.id}
                                                    title={t('actionPause')}
                                                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-amber-500/10 hover:bg-amber-500/25 text-amber-400 border border-amber-500/20 transition-all disabled:opacity-40"
                                                >
                                                    <Pause className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                            {/* Deactivate */}
                                            {row.planStatus !== 'inactive' && (
                                                <button
                                                    onClick={() => updateStatus(row.id, row.brandName, 'inactive', {}, row)}
                                                    disabled={busyId === row.id}
                                                    title={t('actionDeactivate')}
                                                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-500/10 hover:bg-slate-500/25 text-slate-400 border border-slate-500/20 transition-all disabled:opacity-40"
                                                >
                                                    <XCircle className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                            {/* Delete */}
                                            <button
                                                onClick={() => handleDelete(row.id, row.brandName)}
                                                disabled={busyId === row.id}
                                                title={t('actionDelete')}
                                                className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-500/10 hover:bg-red-500/25 text-red-400 border border-red-500/20 transition-all disabled:opacity-40"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Pause reason dialog */}
            {pauseDialog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
                    <div className="bg-[#131929] border border-slate-200 rounded-2xl p-6 w-full max-w-md shadow-2xl">
                        <h3 className="text-white font-bold text-lg mb-2">
                            ⏸️ Pausar: {pauseDialog.name}
                        </h3>
                        <p className="text-slate-400 text-sm mb-4">{t('confirmPause')}</p>
                        <textarea
                            value={pauseReason}
                            onChange={e => setPauseReason(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-white text-sm outline-none focus:border-amber-400/40 resize-none h-24"
                            placeholder="Ej: Cuenta en revisión, colaboración finalizada..."
                        />
                        <div className="flex gap-3 mt-4">
                            <button
                                onClick={() => { setPauseDialog(null); setPauseReason(''); }}
                                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-400 hover:text-slate-800 text-sm transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handlePauseConfirm}
                                className="flex-1 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-400 font-semibold text-sm transition-colors"
                            >
                                {t('actionPause')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
