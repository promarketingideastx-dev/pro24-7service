'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTranslations, useLocale } from 'next-intl';
import {
    BusinessNotificationService,
    BusinessNotification,
    BUSINESS_NOTIF_META
} from '@/services/businessNotification.service';
import { Bell, CheckCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es, enUS, ptBR } from 'date-fns/locale';
import { useRouter } from 'next/navigation';

const dateLocales: Record<string, any> = {
    es,
    en: enUS,
    'pt-BR': ptBR,
    pt: ptBR
};

export default function BusinessNotificationsPage() {
    const { user } = useAuth();
    const router = useRouter();
    const t = useTranslations('business.notifications');
    const tRoot = useTranslations();
    const tStates = useTranslations('common.states');
    const locale = useLocale();
    const [items, setItems] = useState<BusinessNotification[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'appointment' | 'payment'>('all');
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [deleting, setDeleting] = useState(false);

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

    const toggleSelection = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleSelectAll = () => {
        if (selectedIds.size === filtered.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filtered.map(i => i.id)));
        }
    };

    const handleDeleteSelected = async () => {
        if (!user?.uid || selectedIds.size === 0) return;
        setDeleting(true);
        await BusinessNotificationService.deleteSelected(user.uid, Array.from(selectedIds));
        setSelectionMode(false);
        setSelectedIds(new Set());
        setDeleting(false);
    };

    const handleDeleteAll = async () => {
        if (!user?.uid || filtered.length === 0) return;
        if (!confirm(t('delete_all') + '?')) return;
        setDeleting(true);
        await BusinessNotificationService.deleteSelected(user.uid, filtered.map(i => i.id));
        setSelectionMode(false);
        setSelectedIds(new Set());
        setDeleting(false);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <Bell className="w-5 h-5 text-[#14B8A6]" />
                        {t('title')}
                        {unreadCount > 0 && (
                            <span className="px-2 py-0.5 text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/30 rounded-full">
                                {unreadCount} {t('unread')}
                            </span>
                        )}
                    </h1>
                    <p className="text-sm text-slate-500 mt-0.5">{t('subtitle')}</p>
                </div>
                {unreadCount > 0 && !selectionMode && (
                    <button
                        onClick={handleMarkAllRead}
                        className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-800 border border-slate-200 hover:border-slate-300 px-3 py-1.5 rounded-lg transition-colors"
                    >
                        <CheckCheck size={14} />
                        {t('markAllRead')}
                    </button>
                )}
                {selectionMode && (
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => { setSelectionMode(false); setSelectedIds(new Set()); }}
                            className="text-xs text-slate-500 hover:text-slate-700 px-2 py-1.5 transition-colors"
                        >
                            {t('cancel')}
                        </button>
                        <button
                            onClick={handleSelectAll}
                            className="text-xs font-medium text-slate-600 border border-slate-200 px-3 py-1.5 rounded-lg transition-colors hover:bg-slate-50"
                        >
                            {t('select_all')}
                        </button>
                        <button
                            onClick={handleDeleteSelected}
                            disabled={selectedIds.size === 0 || deleting}
                            className="text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {deleting ? '...' : t('delete_selected')}
                        </button>
                    </div>
                )}
            </div>

            {/* Filters */}
            <div className="flex items-center justify-between gap-2">
                <div className="flex gap-2">
                    {(['all', 'appointment', 'payment'] as const).map(f => (
                        <button
                            key={f}
                            onClick={() => { setFilter(f); setSelectedIds(new Set()); }}
                            className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${filter === f
                                ? 'bg-[rgba(20,184,166,0.12)] text-[#0F766E] border border-[#14B8A6]/30'
                                : 'text-slate-600 hover:text-slate-900 bg-[#F8FAFC] border border-[#E6E8EC]'
                                }`}
                        >
                            {t(`filter_${f}`)}
                        </button>
                    ))}
                </div>
                {!selectionMode && filtered.length > 0 && (
                     <div className="flex gap-2">
                         <button
                            onClick={() => setSelectionMode(true)}
                            className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
                         >
                            {t('select')}
                         </button>
                         <button
                            onClick={handleDeleteAll}
                            className="text-xs font-semibold text-red-400 hover:text-red-500 transition-colors"
                         >
                            {t('delete_all')}
                         </button>
                     </div>
                )}
            </div>

            {/* Notification list */}
            {loading ? (
                <div className="text-center py-20 text-slate-500">{tStates('loading')}</div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-20 text-slate-500">
                    <Bell size={32} className="mx-auto mb-3 opacity-20" />
                    <p>{t('empty')}</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {filtered.map(item => {
                        const meta = BUSINESS_NOTIF_META[item.type];
                        const isSelected = selectedIds.has(item.id);
                        return (
                            <div
                                key={item.id}
                                onClick={() => {
                                    if (selectionMode) {
                                        toggleSelection(item.id);
                                    } else {
                                        if (!item.read) {
                                            handleMarkOne(item.id);
                                        }
                                        const isActionable = item.relatedId && ['new_appointment', 'appointment_confirmed', 'appointment_rejected', 'payment_received', 'proof_uploaded'].includes(item.type);
                                        if (isActionable) {
                                            router.push(`/${locale}/business/bookings?bookingId=${item.relatedId}`);
                                        }
                                    }
                                }}
                                className={`flex gap-4 p-4 rounded-2xl border transition-all ${selectionMode ? 'cursor-pointer hover:border-cyan-400' : 'cursor-pointer'} ${item.read
                                    ? 'bg-white/3 border-slate-200 opacity-60'
                                    : 'bg-white/6 border-slate-200 hover:bg-slate-100'
                                    } ${isSelected ? 'border-cyan-400 bg-cyan-50/10 opacity-100' : ''}`}
                            >
                                {selectionMode && (
                                    <div className="flex shrink-0 items-center justify-center pt-2">
                                        <div className={`w-5 h-5 rounded border ${isSelected ? 'bg-cyan-500 border-cyan-500' : 'border-slate-300'} flex items-center justify-center transition-colors`}>
                                            {isSelected && <CheckCheck className="w-3 h-3 text-white" />}
                                        </div>
                                    </div>
                                )}
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-lg ${meta.bg}`}>
                                    {meta.emoji}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                        <p className="text-slate-900 font-semibold text-sm leading-tight">
                                            {t(`types.${item.type}.title`)}
                                        </p>
                                        {!item.read && (
                                            <div className="w-2 h-2 rounded-full bg-cyan-400 shrink-0 mt-1" />
                                        )}
                                    </div>
                                    <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                                        {item.i18nKey 
                                            ? (() => {
                                                console.log("NOTIF:", item);
                                                try {
                                                    const safeVariables = {
                                                        ...item.variables,
                                                        clientName: item.variables?.clientName || "Cliente",
                                                        serviceName: item.variables?.serviceName || "Servicio",
                                                        businessName: item.variables?.businessName || "Negocio"
                                                    };
                                                    return tRoot(item.i18nKey as any, safeVariables);
                                                } catch (e) {
                                                    console.error("i18n error:", e, item);
                                                    return item.body || "Notification";
                                                }
                                            })()
                                            : (() => {
                                                try {
                                                    const params = { 
                                                        clientName: item.variables?.clientName || item.relatedName || 'Cliente', 
                                                        serviceName: item.variables?.serviceName || item.serviceName || 'Servicio' 
                                                    };
                                                    const tBody = t(`types.${item.type}.body` as any, params);
                                                    return tBody && !tBody.includes('.body') ? tBody : (item.body || '');
                                                } catch(err) {
                                                    return item.body || '';
                                                }
                                            })()
                                        }
                                    </p>
                                    {item.createdAt?.toDate && (
                                        <p className="text-slate-600 text-[10px] mt-1.5">
                                            {formatDistanceToNow(item.createdAt.toDate(), { addSuffix: true, locale: dateLocales[locale] || enUS })}
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
