'use client';

import { useState, useEffect, useRef } from 'react';
import { Bell, CheckSquare, Square, Trash2, X } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
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
    const tRoot = useTranslations();
    const locale = useLocale();
    const router = useRouter();
    const dateLocale = locale === 'en' ? enUS : locale === 'pt-BR' ? ptBR : es;
    
    const [unread, setUnread] = useState(0);
    const [open, setOpen] = useState(false);
    const [items, setItems] = useState<ClientNotification[]>([]);
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
        if (!clientId) return;
        const unsub = ClientNotificationService.onUnreadCount(clientId, (count) => {
            if (count > prevUnread.current && prevUnread.current !== -1) {
                // playNotificationSound();
            }
            prevUnread.current = count;
            setUnread(count);
        });
        prevUnread.current = -1;
        return () => unsub();
    }, [clientId]);

    // Feed (last 30 for dropdown so they can actually delete multiple)
    useEffect(() => {
        if (!clientId || !open) return;
        const unsub = ClientNotificationService.onNotifications(clientId, (notifs) => {
            setItems(notifs);
        });
        return () => unsub();
    }, [clientId, open]);

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
            await ClientNotificationService.delete(clientId, Array.from(selectedIds));
            setSelectedIds(new Set());
            if (items.length - selectedIds.size === 0) {
                setIsEditing(false); // Quit edit mode if empty
            }
        } catch (err) {
            console.error('Error deleting notifications', err);
        } finally {
            setIsDeleting(false);
        }
    };

    const handleItemClick = (item: ClientNotification) => {
        if (isEditing) {
            toggleSelection(item.id);
        } else {
            if (!item.read) {
                ClientNotificationService.markRead(clientId, item.id).catch(() => {});
            }
            // Dar vida: navigate based on notification type
            if (item.type === 'new_message') {
                router.push(`/${locale}/user/messages`);
            } else {
                // Bookings, payments, proof
                router.push(`/${locale}/user/profile#appointments`);
            }
            setOpen(false);
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
                <div className="absolute right-0 top-12 w-[320px] sm:w-[380px] bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden flex flex-col">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                        {isEditing ? (
                            <div className="flex items-center justify-between w-full">
                                <button 
                                    onClick={() => { setIsEditing(false); setSelectedIds(new Set()); }}
                                    className="text-xs font-semibold text-slate-500 hover:text-slate-800"
                                >
                                    {t('cancel') || 'Cancelar'}
                                </button>
                                <div className="flex gap-3">
                                    <button 
                                        onClick={handleSelectAll}
                                        className="text-xs font-medium text-[#14B8A6] hover:text-teal-600"
                                    >
                                        {selectedIds.size === items.length ? 'Limpiar' : t('selectAll') || 'Todas'}
                                    </button>
                                    <button 
                                        onClick={handleDeleteSelected}
                                        disabled={selectedIds.size === 0 || isDeleting}
                                        className="text-xs font-medium text-red-500 hover:text-red-600 disabled:opacity-40 flex items-center gap-1"
                                    >
                                        <Trash2 size={12} />
                                        {t('deleteSelected') || 'Borrar'}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <span className="text-sm font-bold text-slate-800">{t('title')}</span>
                                {items.length > 0 && (
                                    <button 
                                        onClick={() => setIsEditing(true)}
                                        className="text-xs font-semibold text-[#14B8A6] hover:text-teal-600"
                                    >
                                        {t('edit') || 'Editar'}
                                    </button>
                                )}
                            </>
                        )}
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
                                const isSelected = selectedIds.has(item.id);
                                return (
                                    <div
                                        key={item.id}
                                        onClick={() => handleItemClick(item)}
                                        className={`px-4 py-3.5 flex gap-3 cursor-pointer hover:bg-slate-50 transition-colors ${item.read && !isEditing ? 'opacity-60' : ''} ${isSelected ? 'bg-teal-50/50' : ''}`}
                                    >
                                        {isEditing && (
                                            <div className="flex items-center justify-center shrink-0 w-6">
                                                {isSelected ? (
                                                    <CheckSquare size={18} className="text-[#14B8A6]" />
                                                ) : (
                                                    <Square size={18} className="text-slate-300" />
                                                )}
                                            </div>
                                        )}
                                        <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-base ${meta.bg}`}>
                                            {meta.emoji}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            {(() => {
                                                let title = t(`types.${item.type}.title`);
                                                // Fallback to type string if missing, avoid empty body
                                                if (!title || title.includes('.title')) {
                                                    title = item.title || 'Notificación';
                                                }

                                                let body = '';
                                                
                                                if (item.i18nKey) {
                                                    body = tRoot(item.i18nKey as any, item.variables);
                                                    if (!body || body.includes(item.i18nKey)) {
                                                        // Fallback mechanism to try finding it inside common/notification/booking etc
                                                        try {
                                                            const parts = item.i18nKey.split('.');
                                                            if (parts.length > 1) {
                                                                const fallbackT = tRoot(`notification.${parts[1]}.${parts[2]}` as any, item.variables);
                                                                if (fallbackT && !fallbackT.includes(`notification.`)) {
                                                                    body = fallbackT;
                                                                }
                                                            }
                                                        } catch(e) {}
                                                    }
                                                }
                                                
                                                if (!body || body === item.i18nKey) {
                                                    try {
                                                        const params = { 
                                                            businessName: item.variables?.businessName || item.relatedName || 'Negocio', 
                                                            serviceName: item.variables?.serviceName || item.serviceName || 'Servicio' 
                                                        };
                                                        const tBody = t(`types.${item.type}.body` as any, params);
                                                        body = tBody && !tBody.includes('.body') ? tBody : (item.body || '');
                                                    } catch (err) {
                                                        body = item.body || '';
                                                    }
                                                }
                                                
                                                return (
                                                    <>
                                                        <p className="text-slate-800 text-sm font-semibold leading-tight truncate">{title}</p>
                                                        <p className="text-slate-500 text-xs mt-1 leading-snug line-clamp-2">{body}</p>
                                                    </>
                                                );
                                            })()}
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
