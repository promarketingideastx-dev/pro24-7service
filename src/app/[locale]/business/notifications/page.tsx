'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTranslations } from 'next-intl';
import {
    BusinessNotificationService,
    BusinessNotification,
    BUSINESS_NOTIF_META
} from '@/services/businessNotification.service';
import { Bell, CheckCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

export default function BusinessNotificationsPage() {
    const { user } = useAuth();
    const t = useTranslations('business.notifications');
    const [items, setItems] = useState<BusinessNotification[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'appointment' | 'payment'>('all');

    useEffect(() => {
        if (!user?.uid) return;
        const unsub = BusinessNotificationService.onNotifications(user.uid, (notifs) => {
            setItems(notifs);
            setLoading(false);
        });
        return () => unsub();
    }, [user?.uid]);

    const handleMarkAllRead = () => {
        if (!user?.uid) return;
        BusinessNotificationService.markAllRead(user.uid).catch(() => { });
    };

    const handleMarkOne = (id: string) => {
        if (!user?.uid) return;
        BusinessNotificationService.markRead(user.uid, id).catch(() => { });
    };

    const filtered = items.filter(i => {
        if (filter === 'appointment') return i.type.startsWith('appointment') || i.type === 'new_appointment';
        if (filter === 'payment') return i.type === 'payment_received';
        return true;
    });

    const unreadCount = items.filter(i => !i.read).length;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-white flex items-center gap-2">
                        <Bell className="w-5 h-5 text-cyan-400" />
                        {t('title')}
                        {unreadCount > 0 && (
                            <span className="px-2 py-0.5 text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/30 rounded-full">
                                {unreadCount} {t('unread')}
                            </span>
                        )}
                    </h1>
                    <p className="text-sm text-slate-500 mt-0.5">{t('subtitle')}</p>
                </div>
                {unreadCount > 0 && (
                    <button
                        onClick={handleMarkAllRead}
                        className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white border border-white/10 hover:border-white/20 px-3 py-1.5 rounded-lg transition-colors"
                    >
                        <CheckCheck size={14} />
                        {t('markAllRead')}
                    </button>
                )}
            </div>

            {/* Filters */}
            <div className="flex gap-2">
                {(['all', 'appointment', 'payment'] as const).map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === f
                            ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                            : 'text-slate-400 hover:text-white bg-white/5 border border-white/5'
                            }`}
                    >
                        {t(`filter_${f}`)}
                    </button>
                ))}
            </div>

            {/* Notification list */}
            {loading ? (
                <div className="text-center py-20 text-slate-500">Cargando...</div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-20 text-slate-500">
                    <Bell size={32} className="mx-auto mb-3 opacity-20" />
                    <p>{t('empty')}</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {filtered.map(item => {
                        const meta = BUSINESS_NOTIF_META[item.type];
                        return (
                            <div
                                key={item.id}
                                onClick={() => !item.read && handleMarkOne(item.id)}
                                className={`flex gap-4 p-4 rounded-2xl border transition-all cursor-pointer ${item.read
                                    ? 'bg-white/3 border-white/5 opacity-60'
                                    : 'bg-white/6 border-white/10 hover:bg-white/10'
                                    }`}
                            >
                                {/* Emoji icon */}
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-lg ${meta.bg}`}>
                                    {meta.emoji}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                        <p className="text-white font-semibold text-sm leading-tight">{item.title}</p>
                                        {!item.read && (
                                            <div className="w-2 h-2 rounded-full bg-cyan-400 shrink-0 mt-1" />
                                        )}
                                    </div>
                                    <p className="text-slate-400 text-xs mt-1 leading-relaxed">{item.body}</p>
                                    {item.createdAt?.toDate && (
                                        <p className="text-slate-600 text-[10px] mt-1.5">
                                            {formatDistanceToNow(item.createdAt.toDate(), { addSuffix: true, locale: es })}
                                        </p>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
