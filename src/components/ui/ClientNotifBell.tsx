'use client';

import { useState, useEffect, useRef } from 'react';
import { Bell, MessageCircle } from 'lucide-react';
import {
    ClientNotificationService,
    ClientNotification,
    CLIENT_NOTIF_META,
} from '@/services/clientNotification.service';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { unlockAudio, playNotificationSound } from '@/lib/audioUtils';

interface ClientNotifBellProps {
    clientUid: string;
}

export default function ClientNotifBell({ clientUid }: ClientNotifBellProps) {
    const locale = useLocale();
    const t = useTranslations('common.notifications');
    const router = useRouter();
    const lp = (path: string) => `/${locale}${path}`;
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

    // Unread badge + sound
    useEffect(() => {
        if (!clientUid) return;
        prevUnread.current = -1;
        const unsub = ClientNotificationService.onUnreadCount(clientUid, (count) => {
            if (count > prevUnread.current && prevUnread.current !== -1) {
                playNotificationSound();
            }
            prevUnread.current = count;
            setUnread(count);
        });
        return () => unsub();
    }, [clientUid]);

    // Feed (dropdown)
    useEffect(() => {
        if (!clientUid || !open) return;
        const unsub = ClientNotificationService.onNotifications(clientUid, (notifs) => {
            setItems(notifs.slice(0, 8));
        });
        return () => unsub();
    }, [clientUid, open]);

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
            ClientNotificationService.markAllRead(clientUid).catch(() => { });
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bell button */}
            <button
                onClick={handleOpen}
                className="relative w-9 h-9 flex items-center justify-center rounded-xl bg-white/15 hover:bg-white/25 text-white transition-all"
                aria-label={t('ariaLabel')}
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
                <div className="absolute right-0 top-12 w-80 bg-[#0d1929] border border-slate-700 rounded-2xl shadow-2xl z-[500] overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                        <span className="text-sm font-bold text-white">{t('title')}</span>
                        {unread === 0 && items.length > 0 && (
                            <span className="text-[10px] text-slate-500">{t('allRead')}</span>
                        )}
                    </div>

                    {items.length === 0 ? (
                        <div className="p-6 text-center text-slate-500 text-sm">
                            <Bell size={20} className="mx-auto mb-2 opacity-30" />
                            {t('emptyState')}
                        </div>
                    ) : (
                        <div className="divide-y divide-white/5 max-h-72 overflow-y-auto">
                            {items.map(item => {
                                const meta = CLIENT_NOTIF_META[item.type];
                                return (
                                    <div key={item.id} className={`px-4 py-3 flex gap-3 ${item.read ? 'opacity-55' : ''}`}>
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

                    {/* Footer: go to messages page */}
                    <div className="px-4 py-2.5 border-t border-white/10">
                        <button
                            onClick={() => { setOpen(false); router.push(lp('/user/messages')); }}
                            className="w-full flex items-center justify-center gap-1.5 text-xs text-[#14B8A6] hover:text-teal-300 font-semibold transition-colors"
                        >
                            <MessageCircle size={12} />
                            {t('viewAllMessages')}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
