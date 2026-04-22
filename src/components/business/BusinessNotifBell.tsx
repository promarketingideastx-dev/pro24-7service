'use client';

import { useState, useEffect, useRef } from 'react';
import { Bell, CheckSquare, Square, Trash2, X } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { unlockAudio, playNotificationSound } from '@/lib/audioUtils';
import {
    BusinessNotificationService,
    BusinessNotification,
    BUSINESS_NOTIF_META
} from '@/services/businessNotification.service';
import { formatDistanceToNow } from 'date-fns';
import { es, enUS, ptBR } from 'date-fns/locale';

const dateLocales: Record<string, any> = {
    es,
    en: enUS,
    'pt-BR': ptBR,
    pt: ptBR
};

interface BusinessNotifBellProps {
    businessId: string;
}

export default function BusinessNotifBell({ businessId }: BusinessNotifBellProps) {
    const t = useTranslations('business.notifications');
    const tRoot = useTranslations();
    const locale = useLocale();
    const router = useRouter();
    const lp = (path: string) => `/${locale}${path}`;
    const [unread, setUnread] = useState(0);
    const [open, setOpen] = useState(false);
    const [items, setItems] = useState<BusinessNotification[]>([]);
    const prevUnread = useRef(-1);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Edit mode state
    const [isEditing, setIsEditing] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isDeleting, setIsDeleting] = useState(false);

    // Unlock iOS audio on first user touch/click
    useEffect(() => {
        const unlock = () => unlockAudio();
        document.addEventListener('touchstart', unlock, { once: true });
        document.addEventListener('click', unlock, { once: true });
        return () => {
            document.removeEventListener('touchstart', unlock);
            document.removeEventListener('click', unlock);
        };
    }, []);

    // Unread badge + sound on new notif
    useEffect(() => {
        if (!businessId) return;
        const unsub = BusinessNotificationService.onUnreadCount(businessId, (count) => {
            if (count > prevUnread.current && prevUnread.current !== -1) {
                playNotificationSound();
            }
            prevUnread.current = count;
            setUnread(count);
        });
        // init prevUnread to -1 to skip sound on first load
        prevUnread.current = -1;
        return () => unsub();
    }, [businessId]);

    // Feed (last 30 for dropdown so they can actually delete multiple)
    useEffect(() => {
        if (!businessId || !open) return;
        const unsub = BusinessNotificationService.onNotifications(businessId, (notifs) => {
            setItems(notifs);
        });
        return () => unsub();
    }, [businessId, open]);

    // Close on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setOpen(false);
                setIsEditing(false);
                setSelectedIds(new Set());
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleOpen = () => {
        if (open) {
            setOpen(false);
            setIsEditing(false);
            setSelectedIds(new Set());
        } else {
            setOpen(true);
            // Cancel pending emails when bell is opened
            import('@/services/notificationQueue.service').then(({ NotificationQueueService }) => {
                NotificationQueueService.cancelAllPendingForTarget(businessId).catch(() => {});
            });
        }
    };

    const toggleSelection = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleSelectAll = () => {
        if (selectedIds.size === items.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(items.map(i => i.id)));
        }
    };

    const handleDeleteSelected = async () => {
        if (selectedIds.size === 0) return;
        setIsDeleting(true);
        try {
            await BusinessNotificationService.deleteSelected(businessId, Array.from(selectedIds));
            setSelectedIds(new Set());
            if (items.length - selectedIds.size === 0) {
                setIsEditing(false);
            }
        } catch (err) {
            console.error('Error deleting notifications', err);
        } finally {
            setIsDeleting(false);
        }
    };

    const handleItemClick = (item: BusinessNotification) => {
        if (isEditing) {
            toggleSelection(item.id);
        } else {
            if (!item.read) {
                BusinessNotificationService.markRead(businessId, item.id).catch(() => {});
            }
            const isActionable = item.relatedId && ['new_appointment', 'appointment_confirmed', 'appointment_rejected', 'payment_received', 'proof_uploaded'].includes(item.type);
            if (isActionable) {
                setOpen(false);
                router.push(lp(`/business/bookings?bookingId=${item.relatedId}`));
            }
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bell button */}
            <button
                onClick={handleOpen}
                className="relative w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-300 hover:text-slate-800 transition-all"
                aria-label="Notificaciones"
            >
                <Bell size={18} />
                {unread > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5 animate-bounce">
                        {unread > 99 ? '99+' : unread}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {open && (
                <div className="absolute right-0 md:left-0 md:right-auto md:-ml-2 top-12 w-[calc(100vw-2rem)] sm:w-[380px] max-w-sm bg-[#0d1929] border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-white/6">
                        {isEditing ? (
                            <div className="flex items-center justify-between w-full">
                                <button 
                                    onClick={() => { setIsEditing(false); setSelectedIds(new Set()); }}
                                    className="text-xs font-semibold text-slate-400 hover:text-white"
                                >
                                    {t('cancel') || 'Cancelar'}
                                </button>
                                <div className="flex gap-3">
                                    <button 
                                        onClick={handleSelectAll}
                                        className="text-xs font-medium text-cyan-400 hover:text-cyan-300"
                                    >
                                        {selectedIds.size === items.length ? 'Limpiar' : t('select_all') || 'Todas'}
                                    </button>
                                    <button 
                                        onClick={handleDeleteSelected}
                                        disabled={selectedIds.size === 0 || isDeleting}
                                        className="text-xs font-medium text-red-500 hover:text-red-400 disabled:opacity-40 flex items-center gap-1"
                                    >
                                        <Trash2 size={12} />
                                        {t('delete_selected') || 'Borrar'}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <span className="text-sm font-bold text-white">{t('title')}</span>
                                <div className="flex items-center gap-3">
                                    {items.length > 0 && (
                                        <button 
                                            onClick={() => setIsEditing(true)}
                                            className="text-xs font-semibold text-cyan-400 hover:text-cyan-300"
                                        >
                                            Editar
                                        </button>
                                    )}
                                    <a href={`./notifications`} className="text-xs text-slate-400 hover:text-white hover:underline">
                                        {t('seeAll')}
                                    </a>
                                </div>
                            </>
                        )}
                    </div>

                    {items.length === 0 ? (
                        <div className="p-6 text-center text-slate-500 text-sm">
                            <Bell size={20} className="mx-auto mb-2 opacity-30" />
                            {t('empty')}
                        </div>
                    ) : (
                        <div className="divide-y divide-white/4 max-h-[60vh] overflow-y-auto no-scrollbar">
                            {items.map(item => {
                                const meta = BUSINESS_NOTIF_META[item.type as any] || { emoji: '🔔', color: '#94a3b8', bg: 'bg-slate-500/10' };
                                const isSelected = selectedIds.has(item.id);
                                let title = t(`types.${item.type}.title`);
                                let body = '';
                                
                                if (item.i18nKey) {
                                    body = tRoot(item.i18nKey as any, item.variables);
                                } else {
                                    // Legacy fallback support
                                    try {
                                        const params = { 
                                            clientName: item.variables?.clientName || item.relatedName || 'Cliente', 
                                            serviceName: item.variables?.serviceName || item.serviceName || 'Servicio' 
                                        };
                                        const tBody = t(`types.${item.type}.body` as any, params);
                                        body = tBody && !tBody.includes('.body') ? tBody : (item.body || '');
                                    } catch (err) {
                                        body = item.body || '';
                                    }
                                }

                                return (
                                    <div
                                        key={item.id}
                                        onClick={() => handleItemClick(item)}
                                        className={`px-4 py-3.5 flex gap-3 cursor-pointer transition-colors ${item.read && !isEditing ? 'opacity-60' : 'hover:bg-white/5'} ${isSelected ? 'bg-cyan-500/10' : ''}`}
                                    >
                                        {isEditing && (
                                            <div className="flex items-center justify-center shrink-0 w-6">
                                                {isSelected ? (
                                                    <CheckSquare size={18} className="text-cyan-400" />
                                                ) : (
                                                    <Square size={18} className="text-slate-500" />
                                                )}
                                            </div>
                                        )}
                                        <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-base ${meta.bg}`}>
                                            {meta.emoji}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-white text-sm font-semibold leading-tight truncate">{title}</p>
                                            <p className="text-slate-400 text-xs mt-0.5 line-clamp-2">{body}</p>
                                            {item.createdAt?.toDate && (
                                                <p className="text-slate-600 text-[10px] mt-1">
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
            )}
        </div>
    );
}
