'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import { useAdminContext } from '@/context/AdminContext';
import { AdminNotificationService, NOTIF_META } from '@/services/adminNotification.service';
import type { AdminNotification } from '@/types/admin-notifications';
import {
    Bell, CheckCheck, Trash2, ArrowUpDown,
    ArrowDown, ArrowUp, Square, CheckSquare, Minus,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es, enUS, ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import Link from 'next/link';

export default function AdminNotificationsPage() {
    const { selectedCountry } = useAdminContext();
    const t = useTranslations('admin.notifications');
    const locale = useLocale();
    const lp = (path: string) => `/${locale}${path}`;

    const [notifications, setNotifications] = useState<AdminNotification[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'unread'>('all');
    const [sortDesc, setSortDesc] = useState(true); // true = recientes primero
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        const unsub = AdminNotificationService.onNotifications(500, (notifs) => {
            setNotifications(notifs);
            setLoading(false);
        });
        return () => unsub();
    }, []);

    const displayed = notifications
        .filter(n => {
            if (selectedCountry !== 'ALL' && n.country && n.country !== selectedCountry) return false;
            if (filter === 'unread') return !n.read;
            return true;
        })
        .sort((a, b) => {
            const ta = a.createdAt?.toDate?.()?.getTime?.() ?? 0;
            const tb = b.createdAt?.toDate?.()?.getTime?.() ?? 0;
            return sortDesc ? tb - ta : ta - tb;
        });

    const unreadCount = notifications.filter(n => !n.read).length;
    const allSelected = displayed.length > 0 && displayed.every(n => selected.has(n.id));
    const someSelected = displayed.some(n => selected.has(n.id)) && !allSelected;

    // ── Selection helpers ──
    const toggleSelect = (id: string) => {
        setSelected(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const toggleAll = () => {
        if (allSelected) {
            setSelected(new Set());
        } else {
            setSelected(new Set(displayed.map(n => n.id)));
        }
    };

    // ── Actions ──
    const markRead = async (id: string) => {
        await AdminNotificationService.markRead(id);
    };

    const markAllRead = async () => {
        await AdminNotificationService.markAllRead();
        toast.success(t('markAllRead'));
    };

    const deleteOne = async (id: string) => {
        await AdminNotificationService.deleteOne(id);
        setSelected(prev => { const next = new Set(prev); next.delete(id); return next; });
        toast.success('Notificación eliminada');
    };

    const deleteSelected = async () => {
        if (selected.size === 0) return;
        setDeleting(true);
        await AdminNotificationService.deleteSelected(Array.from(selected));
        setSelected(new Set());
        setDeleting(false);
        toast.success(`${selected.size} notificaciones eliminadas`);
    };

    const deleteAll = async () => {
        if (!window.confirm('¿Eliminar TODAS las notificaciones? Esta acción no se puede deshacer.')) return;
        setDeleting(true);
        await AdminNotificationService.deleteAll();
        setSelected(new Set());
        setDeleting(false);
        toast.success('Todas las notificaciones eliminadas');
    };

    // ── Relative time ──
    const relativeTime = (ts: any) => {
        if (!ts?.toDate) return '';
        const dateFnsLocale = locale === 'en' ? enUS : locale === 'pt-BR' ? ptBR : es;
        try { return formatDistanceToNow(ts.toDate(), { addSuffix: true, locale: dateFnsLocale }); } catch { return ''; }
    };

    const getLink = (n: AdminNotification) => {
        if (!n.relatedId) return null;
        if (n.type === 'new_business' || n.type === 'plan_upgrade') return lp('/admin/businesses');
        if (n.type === 'new_user') return lp('/admin/users');
        if (n.type === 'new_dispute' || n.type === 'dispute_reply') return lp('/admin/disputes');
        return null;
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-xl font-bold text-white flex items-center gap-2">
                        <Bell size={20} className="text-brand-neon-cyan" />
                        {t('title')}
                    </h1>
                    <p className="text-xs text-slate-500 mt-0.5">{unreadCount} {t('unread')} · {notifications.length} total</p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    {/* Sort toggle */}
                    <button
                        onClick={() => setSortDesc(p => !p)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white/3 border border-white/8 text-slate-400 hover:text-white text-xs font-medium rounded-xl transition-colors"
                    >
                        {sortDesc ? <ArrowDown size={12} /> : <ArrowUp size={12} />}
                        {sortDesc ? 'Más recientes' : 'Más antiguas'}
                    </button>

                    {/* Filter tabs */}
                    {(['all', 'unread'] as const).map(f => (
                        <button key={f} onClick={() => setFilter(f)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all border ${filter === f
                                ? 'bg-white/10 border-white/20 text-white'
                                : 'bg-white/3 border-white/8 text-slate-400 hover:text-white'
                                }`}>
                            {f === 'all' ? t('all') : `${t('unread')} (${unreadCount})`}
                        </button>
                    ))}

                    {unreadCount > 0 && (
                        <button onClick={markAllRead}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-neon-cyan/10 border border-brand-neon-cyan/20 text-brand-neon-cyan text-xs font-medium rounded-xl hover:bg-brand-neon-cyan/20 transition-colors">
                            <CheckCheck size={13} /> {t('markAllRead')}
                        </button>
                    )}

                    {/* Delete all */}
                    <button onClick={deleteAll} disabled={deleting || notifications.length === 0}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium rounded-xl hover:bg-red-500/20 transition-colors disabled:opacity-40">
                        <Trash2 size={13} /> Eliminar todas
                    </button>
                </div>
            </div>

            {/* Floating selection bar */}
            {selected.size > 0 && (
                <div className="flex items-center gap-3 px-4 py-3 bg-brand-neon-cyan/10 border border-brand-neon-cyan/20 rounded-xl">
                    <span className="text-sm text-brand-neon-cyan font-semibold">{selected.size} seleccionadas</span>
                    <button
                        onClick={deleteSelected}
                        disabled={deleting}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50"
                    >
                        <Trash2 size={12} /> Eliminar seleccionadas
                    </button>
                    <button
                        onClick={() => setSelected(new Set())}
                        className="text-xs text-slate-400 hover:text-white transition-colors"
                    >
                        Cancelar
                    </button>
                </div>
            )}

            {/* List */}
            <div className="space-y-1.5">
                {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="h-16 bg-white/3 rounded-xl animate-pulse border border-white/5" />
                    ))
                ) : displayed.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-3">
                        <Bell size={36} className="opacity-20" />
                        <p className="text-sm">{filter === 'unread' ? t('noUnread') : t('none')}</p>
                    </div>
                ) : (
                    <>
                        {/* Select-all row */}
                        <div className="flex items-center gap-3 px-3 py-2 text-xs text-slate-500">
                            <button onClick={toggleAll} className="flex items-center gap-2 hover:text-white transition-colors">
                                {allSelected
                                    ? <CheckSquare size={14} className="text-brand-neon-cyan" />
                                    : someSelected
                                        ? <Minus size={14} className="text-brand-neon-cyan" />
                                        : <Square size={14} />
                                }
                                {allSelected ? 'Deseleccionar todas' : 'Seleccionar todas'}
                            </button>
                            <span className="ml-auto">{displayed.length} notificaciones</span>
                        </div>

                        {displayed.map(n => {
                            const meta = NOTIF_META[n.type] ?? NOTIF_META.system;
                            const link = getLink(n);
                            const isExpanded = expandedId === n.id;
                            const isSelected = selected.has(n.id);

                            // Left border color per notification type
                            const borderColor: Record<string, string> = {
                                new_business: 'border-l-green-500',
                                plan_upgrade: 'border-l-purple-400',
                                new_user: 'border-l-blue-400',
                                new_dispute: 'border-l-red-400',
                                dispute_reply: 'border-l-amber-400',
                                payment_failed: 'border-l-red-500',
                                review_flagged: 'border-l-amber-500',
                                system: 'border-l-slate-400',
                            };
                            const leftBorder = borderColor[n.type] ?? 'border-l-slate-400';

                            return (
                                <div
                                    key={n.id}
                                    className={`
                                         rounded-xl border-l-[3px] border border-r border-t border-b
                                         transition-all duration-200
                                         ${leftBorder}
                                         ${isExpanded
                                            ? 'bg-[#0d1f3c] border-brand-neon-cyan/30 shadow-[0_0_16px_rgba(34,211,238,0.08)]'
                                            : isSelected
                                                ? 'bg-brand-neon-cyan/5 border-brand-neon-cyan/20'
                                                : n.read
                                                    ? 'bg-white/[0.02] border-white/[0.04] opacity-40 grayscale-[30%]'
                                                    : 'bg-[#0d1a30] border-white/10 hover:border-white/20'
                                        }
                                     `}
                                >
                                    {/* Main row */}
                                    <div className="flex items-start gap-3 p-3.5">
                                        {/* Checkbox */}
                                        <button
                                            onClick={() => toggleSelect(n.id)}
                                            className="mt-1 shrink-0 text-slate-600 hover:text-brand-neon-cyan transition-colors"
                                        >
                                            {isSelected
                                                ? <CheckSquare size={15} className="text-brand-neon-cyan" />
                                                : <Square size={15} />
                                            }
                                        </button>

                                        {/* Emoji icon */}
                                        <div className={`w-9 h-9 rounded-xl ${meta.bg} flex items-center justify-center text-lg shrink-0 mt-0.5`}>
                                            {meta.emoji}
                                        </div>

                                        {/* Content — click to expand, double-click to navigate */}
                                        <div
                                            className="flex-1 min-w-0 cursor-pointer"
                                            onClick={() => {
                                                if (!n.read) markRead(n.id);
                                                setExpandedId(isExpanded ? null : n.id);
                                            }}
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <p className={`text-sm font-semibold leading-snug ${n.read ? 'text-slate-500' : 'text-white'}`}>
                                                    {n.title}
                                                </p>
                                                <span className="text-[10px] text-slate-600 whitespace-nowrap shrink-0">{relativeTime(n.createdAt)}</span>
                                            </div>
                                            <p className={`text-xs mt-0.5 leading-relaxed ${n.read ? 'text-slate-600' : 'text-slate-400'}`}>{n.body}</p>
                                            {n.relatedName && !isExpanded && (
                                                <span className="text-[10px] text-slate-600 mt-1 block">{n.relatedName}</span>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-1 shrink-0 mt-0.5">
                                            {link && (
                                                <Link href={link}
                                                    className="p-1.5 text-slate-500 hover:text-brand-neon-cyan transition-colors rounded-lg hover:bg-white/5"
                                                    title="Ver en CRM">
                                                    <ArrowUpDown size={13} />
                                                </Link>
                                            )}
                                            {!n.read && (
                                                <button onClick={() => markRead(n.id)}
                                                    className="p-1.5 text-slate-500 hover:text-green-400 transition-colors rounded-lg hover:bg-white/5"
                                                    title="Marcar leída">
                                                    <CheckCheck size={13} />
                                                </button>
                                            )}
                                            <button onClick={() => deleteOne(n.id)}
                                                className="p-1.5 text-slate-500 hover:text-red-400 transition-colors rounded-lg hover:bg-white/5"
                                                title="Eliminar">
                                                <Trash2 size={13} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Expanded detail panel */}
                                    {isExpanded && (
                                        <div className="px-14 pb-3.5 text-xs text-slate-400 border-t border-white/5 pt-2.5 space-y-1.5">
                                            <p><span className="text-slate-600">Tipo:</span> {n.type}</p>
                                            {n.relatedName && <p><span className="text-slate-600">Negocio:</span> {n.relatedName}</p>}
                                            {n.country && <p><span className="text-slate-600">País:</span> {n.country}</p>}
                                            {n.relatedId && <p><span className="text-slate-600">ID:</span> <span className="font-mono text-[10px]">{n.relatedId}</span></p>}
                                            <p><span className="text-slate-600">Fecha exacta:</span> {n.createdAt?.toDate?.()?.toLocaleString('es-HN') ?? '—'}</p>
                                            {link && (
                                                <Link href={link}
                                                    className="inline-flex items-center gap-1 text-brand-neon-cyan hover:underline mt-1">
                                                    Ver en el Admin CRM →
                                                </Link>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </>
                )}
            </div>
        </div>
    );
}
