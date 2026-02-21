'use client';

import { useState, useEffect } from 'react';
import { useAdminContext } from '@/context/AdminContext';
import { AdminNotificationService, NOTIF_META } from '@/services/adminNotification.service';
import type { AdminNotification } from '@/types/admin-notifications';
import { Bell, CheckCheck, Trash2, ExternalLink } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import Link from 'next/link';

export default function AdminNotificationsPage() {
    const { selectedCountry } = useAdminContext();
    const [notifications, setNotifications] = useState<AdminNotification[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'unread'>('all');

    useEffect(() => {
        const unsub = AdminNotificationService.onNotifications(200, (notifs) => {
            setNotifications(notifs);
            setLoading(false);
        });
        return () => unsub();
    }, []);

    const displayed = notifications.filter(n => {
        if (selectedCountry !== 'ALL' && n.country && n.country !== selectedCountry) return false;
        if (filter === 'unread') return !n.read;
        return true;
    });

    const unreadCount = notifications.filter(n => !n.read).length;

    const markRead = async (id: string) => {
        await AdminNotificationService.markRead(id);
    };

    const markAllRead = async () => {
        await AdminNotificationService.markAllRead();
        toast.success('Todas marcadas como leídas');
    };

    const relativeTime = (ts: any) => {
        if (!ts?.toDate) return '';
        try { return formatDistanceToNow(ts.toDate(), { addSuffix: true, locale: es }); } catch { return ''; }
    };

    const getLink = (n: AdminNotification) => {
        if (!n.relatedId) return null;
        if (n.type === 'new_business' || n.type === 'plan_upgrade') return `/admin/businesses`;
        if (n.type === 'new_user') return `/admin/users`;
        if (n.type === 'new_dispute' || n.type === 'dispute_reply') return `/admin/disputes`;
        return null;
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-white flex items-center gap-2">
                        <Bell size={20} className="text-brand-neon-cyan" />
                        Notificaciones
                    </h1>
                    <p className="text-xs text-slate-500 mt-0.5">{unreadCount} no leídas</p>
                </div>
                <div className="flex items-center gap-2">
                    {/* Filter tabs */}
                    {['all', 'unread'].map(f => (
                        <button key={f} onClick={() => setFilter(f as any)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all border ${filter === f
                                ? 'bg-white/10 border-white/20 text-white'
                                : 'bg-white/3 border-white/8 text-slate-400 hover:text-white'
                                }`}>
                            {f === 'all' ? 'Todas' : `No leídas (${unreadCount})`}
                        </button>
                    ))}
                    {unreadCount > 0 && (
                        <button onClick={markAllRead}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-neon-cyan/10 border border-brand-neon-cyan/20 text-brand-neon-cyan text-xs font-medium rounded-xl hover:bg-brand-neon-cyan/20 transition-colors">
                            <CheckCheck size={13} /> Marcar todas
                        </button>
                    )}
                </div>
            </div>

            {/* List */}
            <div className="space-y-1.5">
                {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="h-16 bg-white/3 rounded-xl animate-pulse border border-white/5" />
                    ))
                ) : displayed.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-3">
                        <Bell size={36} className="opacity-20" />
                        <p className="text-sm">{filter === 'unread' ? 'No hay notificaciones sin leer' : 'Sin notificaciones'}</p>
                    </div>
                ) : (
                    displayed.map(n => {
                        const meta = NOTIF_META[n.type] ?? NOTIF_META.system;
                        const link = getLink(n);
                        return (
                            <div key={n.id}
                                className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all ${n.read
                                    ? 'bg-white/2 border-white/5 opacity-60'
                                    : 'bg-white/5 border-white/10'
                                    }`}>
                                {/* Emoji icon */}
                                <div className={`w-9 h-9 rounded-xl ${meta.bg} flex items-center justify-center text-lg shrink-0 mt-0.5`}>
                                    {meta.emoji}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                        <p className={`text-sm font-semibold leading-snug ${n.read ? 'text-slate-400' : 'text-white'}`}>
                                            {n.title}
                                        </p>
                                        <span className="text-[10px] text-slate-600 whitespace-nowrap shrink-0">{relativeTime(n.createdAt)}</span>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{n.body}</p>
                                    {n.relatedName && (
                                        <span className="text-[10px] text-slate-600 mt-1 block">{n.relatedName}</span>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-1 shrink-0 mt-0.5">
                                    {link && (
                                        <Link href={link}
                                            className="p-1.5 text-slate-500 hover:text-brand-neon-cyan transition-colors rounded-lg hover:bg-white/5">
                                            <ExternalLink size={13} />
                                        </Link>
                                    )}
                                    {!n.read && (
                                        <button onClick={() => markRead(n.id)}
                                            className="p-1.5 text-slate-500 hover:text-green-400 transition-colors rounded-lg hover:bg-white/5">
                                            <CheckCheck size={13} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
