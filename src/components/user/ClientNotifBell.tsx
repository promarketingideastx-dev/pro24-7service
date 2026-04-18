'use client';

import { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { unlockAudio, playNotificationSound } from '@/lib/audioUtils';
import {
    ClientNotificationService,
    ClientNotification,
    CLIENT_NOTIF_META
} from '@/services/clientNotification.service';
import { formatDistanceToNow } from 'date-fns';
import { es, enUS, ptBR } from 'date-fns/locale';

interface ClientNotifBellProps {
    clientId: string;
}

export default function ClientNotifBell({ clientId }: ClientNotifBellProps) {
    const t = useTranslations('userProfile.notifications');
    const locale = useLocale();
    const dateLocale = locale === 'en' ? enUS : locale === 'pt-BR' ? ptBR : es;
    
    const [unread, setUnread] = useState(0);
    const [open, setOpen] = useState(false);
    const [items, setItems] = useState<ClientNotification[]>([]);
    const prevUnread = useRef(-1);
    const dropdownRef = useRef<HTMLDivElement>(null);

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
        if (!clientId) return;
        const unsub = ClientNotificationService.onUnreadCount(clientId, (count) => {
            if (count > prevUnread.current && prevUnread.current !== -1) {
                playNotificationSound();
            }
            prevUnread.current = count;
            setUnread(count);
        });
        prevUnread.current = -1;
        return () => unsub();
    }, [clientId]);

    // Feed (last 5 for dropdown)
    useEffect(() => {
        if (!clientId || !open) return;
        const unsub = ClientNotificationService.onNotifications(clientId, (notifs) => {
            setItems(notifs.slice(0, 5));
        });
        return () => unsub();
    }, [clientId, open]);

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
            ClientNotificationService.markAllRead(clientId).catch(() => { });
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bell button */}
            <button
                onClick={handleOpen}
                className="relative w-10 h-10 flex items-center justify-center rounded-xl bg-white hover:bg-slate-50 border border-slate-200/60 text-slate-400 hover:text-[#14B8A6] transition-all shadow-sm"
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
                <div className="absolute right-0 top-12 w-[300px] sm:w-[350px] bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                        <span className="text-sm font-bold text-slate-800">{t('title')}</span>
                    </div>

                    {items.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 text-sm">
                            <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-3">
                                <Bell size={20} className="opacity-40" />
                            </div>
                            {t('empty')}
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto no-scrollbar">
                            {items.map(item => {
                                const meta = CLIENT_NOTIF_META[item.type] || { emoji: '🔔', color: '#64748b', bg: 'bg-slate-100' };
                                return (
                                    <div
                                        key={item.id}
                                        className={`px-4 py-3.5 flex gap-3 hover:bg-slate-50 transition-colors ${item.read ? 'opacity-60' : ''}`}
                                    >
                                        <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-base ${meta.bg}`}>
                                            {meta.emoji}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-slate-800 text-sm font-semibold leading-tight truncate">{item.title}</p>
                                            <p className="text-slate-500 text-xs mt-1 leading-snug line-clamp-2">{item.body}</p>
                                            {item.createdAt?.toDate && (
                                                <p className="text-slate-400 text-[10px] mt-1.5 font-medium">
                                                    {formatDistanceToNow(item.createdAt.toDate(), { addSuffix: true, locale: dateLocale })}
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
