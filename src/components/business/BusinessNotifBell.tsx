'use client';

import { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
    BusinessNotificationService,
    BusinessNotification,
    BUSINESS_NOTIF_META
} from '@/services/businessNotification.service';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface BusinessNotifBellProps {
    businessId: string;
}

export default function BusinessNotifBell({ businessId }: BusinessNotifBellProps) {
    const t = useTranslations('business.notifications');
    const [unread, setUnread] = useState(0);
    const [open, setOpen] = useState(false);
    const [items, setItems] = useState<BusinessNotification[]>([]);
    const prevUnread = useRef(0);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Load audio
    useEffect(() => {
        audioRef.current = new Audio('/sounds/notification.mp3');
        audioRef.current.volume = 0.6;
    }, []);

    // Unread badge + sound on new notif
    useEffect(() => {
        if (!businessId) return;
        const unsub = BusinessNotificationService.onUnreadCount(businessId, (count) => {
            if (count > prevUnread.current && prevUnread.current !== -1) {
                try { audioRef.current?.play(); } catch { /* silent */ }
            }
            prevUnread.current = count;
            setUnread(count);
        });
        // init prevUnread to -1 to skip sound on first load
        prevUnread.current = -1;
        return () => unsub();
    }, [businessId]);

    // Feed (last 5 for dropdown)
    useEffect(() => {
        if (!businessId || !open) return;
        const unsub = BusinessNotificationService.onNotifications(businessId, (notifs) => {
            setItems(notifs.slice(0, 5));
        });
        return () => unsub();
    }, [businessId, open]);

    // Close on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleOpen = () => {
        setOpen(o => !o);
        if (!open && unread > 0) {
            BusinessNotificationService.markAllRead(businessId).catch(() => { });
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bell button */}
            <button
                onClick={handleOpen}
                className="relative w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all"
                aria-label="Notificaciones"
            >
                <Bell size={18} />
                {unread > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5 animate-bounce">
                        {unread > 9 ? '9+' : unread}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {open && (
                <div className="absolute right-0 top-12 w-80 bg-[#0d1929] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-white/6">
                        <span className="text-sm font-bold text-white">{t('title')}</span>
                        <a href={`./notifications`} className="text-xs text-cyan-400 hover:underline">
                            {t('seeAll')}
                        </a>
                    </div>

                    {items.length === 0 ? (
                        <div className="p-6 text-center text-slate-500 text-sm">
                            <Bell size={20} className="mx-auto mb-2 opacity-30" />
                            {t('empty')}
                        </div>
                    ) : (
                        <div className="divide-y divide-white/4">
                            {items.map(item => {
                                const meta = BUSINESS_NOTIF_META[item.type];
                                return (
                                    <div key={item.id} className={`px-4 py-3 flex gap-3 ${item.read ? 'opacity-60' : ''}`}>
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-base ${meta.bg}`}>
                                            {meta.emoji}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-white text-sm font-semibold leading-tight truncate">{item.title}</p>
                                            <p className="text-slate-400 text-xs mt-0.5 line-clamp-2">{item.body}</p>
                                            {item.createdAt?.toDate && (
                                                <p className="text-slate-600 text-[10px] mt-1">
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
            )}
        </div>
    );
}
