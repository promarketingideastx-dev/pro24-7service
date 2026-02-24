'use client';

import { useState, useEffect, useRef } from 'react';
import { Menu, Globe, ChevronDown, LogOut, Bell, CheckCheck, Volume2, VolumeX } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { useAdminContext } from '@/context/AdminContext';
import { useLocale, useTranslations } from 'next-intl';
import LanguageSwitcher from '@/components/ui/LanguageSwitcher';
import Link from 'next/link';
import { AdminNotificationService, NOTIF_META } from '@/services/adminNotification.service';
import type { AdminNotification } from '@/types/admin-notifications';
import { formatDistanceToNow } from 'date-fns';
import { es, enUS, ptBR } from 'date-fns/locale';

// ── Notification sound ─────────────────────────────────────────────────────────────────
// Two-layer approach:
//   1. Web Notifications API — OS-level popup + native system sound (no autoplay restriction)
//   2. HTML Audio fallback — WAV file for when browser audio context allows it

// Pre-load audio once so it can be replayed (works better than creating new Audio each time)
let _preloadedAudio: HTMLAudioElement | null = null;

function getPreloadedAudio(): HTMLAudioElement | null {
    if (typeof window === 'undefined') return null;
    if (!_preloadedAudio) {
        _preloadedAudio = new Audio('/sounds/notify.wav');
        _preloadedAudio.volume = 0.7;
        _preloadedAudio.load(); // pre-load the file
    }
    return _preloadedAudio;
}

export function playBellSound() {
    try {
        const audio = getPreloadedAudio();
        if (!audio) return;
        audio.currentTime = 0;
        audio.play().catch(() => { /* browser blocked — will use OS notification instead */ });
    } catch { /* silent */ }
}

export function showOSNotification(title: string, body: string) {
    if (typeof window === 'undefined') return;
    if ('Notification' in window && Notification.permission === 'granted') {
        try {
            new Notification(title, {
                body,
                icon: '/favicon.ico',
                silent: false, // Use OS native sound
            });
        } catch { /* silent */ }
    }
}


type CountryCode = 'ALL' | 'HN' | 'GT' | 'SV' | 'NI' | 'CR' | 'PA' | 'MX' | 'US' | 'CA' | 'CO' | 'BR' | 'AR' | 'CL' | 'PE' | 'EC' | 'VE' | 'BO' | 'PY' | 'UY' | 'DO' | 'CU' | 'ES';

const COUNTRY_FLAGS: Record<CountryCode, string> = {
    ALL: '🌍', HN: '🇭🇳', GT: '🇬🇹', SV: '🇸🇻', NI: '🇳🇮', CR: '🇨🇷',
    PA: '🇵🇦', MX: '🇲🇽', US: '🇺🇸', CA: '🇨🇦', CO: '🇨🇴', BR: '🇧🇷',
    AR: '🇦🇷', CL: '🇨🇱', PE: '🇵🇪', EC: '🇪🇨', VE: '🇻🇪', BO: '🇧🇴',
    PY: '🇵🇾', UY: '🇺🇾', DO: '🇩🇴', CU: '🇨🇺', ES: '🇪🇸',
};

const COUNTRY_CODES: CountryCode[] = ['ALL', 'HN', 'GT', 'SV', 'NI', 'CR', 'PA', 'MX', 'US', 'CA', 'CO', 'BR', 'AR', 'CL', 'PE', 'EC', 'VE', 'BO', 'PY', 'UY', 'DO', 'CU', 'ES'];

interface AdminHeaderProps {
    onMenuToggle: () => void;
}

export default function AdminHeader({ onMenuToggle }: AdminHeaderProps) {
    const { user } = useAuth();
    const router = useRouter();
    const locale = useLocale();
    const t = useTranslations('admin.header');
    const { selectedCountry, setSelectedCountry } = useAdminContext();
    const [countryOpen, setCountryOpen] = useState(false);

    // ── Notification bell state ──
    const [bellOpen, setBellOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [bellShake, setBellShake] = useState(false);
    const [soundMuted, setSoundMuted] = useState(false);
    const [recentNotifs, setRecentNotifs] = useState<AdminNotification[]>([]);
    const [expandedNotifId, setExpandedNotifId] = useState<string | null>(null);
    const bellRef = useRef<HTMLDivElement>(null);
    const prevCountRef = useRef<number>(-1); // -1 = initial snapshot, skip sound
    const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Request OS Notification permission when admin panel loads
    useEffect(() => {
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
        // Pre-load the audio file immediately
        getPreloadedAudio();
    }, []);
    const getCountryLabel = (code: CountryCode) =>
        code === 'ALL' ? t('allCountries') : t(`countries.${code}`);

    const currentFlag = COUNTRY_FLAGS[selectedCountry as CountryCode] ?? '🌍';
    const currentLabel = getCountryLabel(selectedCountry as CountryCode);

    const handleLogout = async () => {
        await signOut(auth);
        router.replace(`/${locale}/auth/login`);
    };

    // Real-time unread count → plays sound + shake when new notification arrives
    useEffect(() => {
        const unsub = AdminNotificationService.onUnreadCount((count) => {
            setUnreadCount(count);
            if (prevCountRef.current !== -1 && count > prevCountRef.current && !soundMuted) {
                // Layer 1: OS notification with native sound (no autoplay restriction)
                showOSNotification(
                    '🔔 Nueva notificación PRO24/7',
                    `Tienes ${count} notificaciones sin leer`
                );
                // Layer 2: WAV audio fallback
                playBellSound();
                setBellShake(true);
                setTimeout(() => setBellShake(false), 800);
            }
            prevCountRef.current = count;
        });
        return () => unsub();
    }, [soundMuted]);

    // Real-time last 8 notifications for mini-dropdown
    useEffect(() => {
        const unsub = AdminNotificationService.onNotifications(8, setRecentNotifs);
        return () => unsub();
    }, []);

    // Close bell dropdown on outside click
    useEffect(() => {
        if (!bellOpen) return;
        const handler = (e: MouseEvent) => {
            if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [bellOpen]);

    const relativeTime = (ts: any) => {
        if (!ts?.toDate) return '';
        const dateFnsLocale = locale === 'en' ? enUS : locale === 'pt-BR' ? ptBR : es;
        try { return formatDistanceToNow(ts.toDate(), { addSuffix: true, locale: dateFnsLocale }); } catch { return ''; }
    };

    return (
        <header className="h-14 bg-white border-b border-slate-200 flex items-center px-4 gap-3 sticky top-0 z-[2000]">
            <button onClick={onMenuToggle} className="text-slate-400 hover:text-slate-800 transition-colors lg:hidden">
                <Menu size={18} />
            </button>

            <div className="flex-1" />

            {/* Country Selector */}
            <div className="relative">
                <button
                    onClick={() => { setCountryOpen(p => !p); }}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 hover:border-slate-300 text-sm text-slate-700 transition-colors"
                >
                    <Globe size={14} className="text-[#14B8A6]" />
                    <span>{currentFlag} {selectedCountry}</span>
                    <ChevronDown size={12} className="text-slate-400" />
                </button>
                {countryOpen && (
                    <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl w-52 z-[2100] overflow-y-auto max-h-80">
                        {COUNTRY_CODES.map(code => (
                            <button
                                key={code}
                                onClick={() => { setSelectedCountry(code); setCountryOpen(false); }}
                                className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 hover:bg-slate-50 transition-colors ${selectedCountry === code ? 'text-[#14B8A6] font-semibold' : 'text-slate-700'}`}
                            >
                                <span>{COUNTRY_FLAGS[code]}</span>
                                <span className="flex-1">{getCountryLabel(code)}</span>
                                {selectedCountry === code && <span className="text-[#14B8A6]">✓</span>}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Language Selector */}
            <LanguageSwitcher />

            {/* 🔔 Notification Bell */}
            <div ref={bellRef} className="relative">
                <button
                    onClick={() => setBellOpen(p => !p)}
                    className={`relative p-2 text-slate-400 hover:text-slate-800 transition-colors rounded-lg hover:bg-slate-50 ${bellShake ? 'animate-[shake_0.4s_ease-in-out]' : ''}`}
                    style={bellShake ? { animation: 'bellShake 0.5s ease-in-out' } : {}}
                >
                    <Bell
                        size={17}
                        className={bellShake ? 'text-[#14B8A6]' : ''}
                        style={bellShake ? {
                            display: 'inline-block',
                            animationName: 'bellRing',
                            animationDuration: '0.6s',
                            animationTimingFunction: 'ease-in-out',
                            transformOrigin: 'top center',
                        } : {}}
                    />
                    {unreadCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
                            {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                    )}
                </button>

                {/* Mute toggle — small button beside the bell */}
                <button
                    onClick={() => setSoundMuted(p => !p)}
                    title={soundMuted ? 'Activar sonido de notificaciones' : 'Silenciar notificaciones'}
                    className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-white border border-slate-200 flex items-center justify-center text-[8px] hover:border-slate-300 transition-colors"
                >
                    {soundMuted
                        ? <VolumeX size={8} className="text-slate-500" />
                        : <Volume2 size={8} className="text-[#14B8A6]" />}
                </button>

                {/* Inject bell ring keyframes */}
                <style>{`
                    @keyframes bellRing {
                        0%   { transform: rotate(0deg); }
                        15%  { transform: rotate(15deg); }
                        30%  { transform: rotate(-13deg); }
                        45%  { transform: rotate(10deg); }
                        60%  { transform: rotate(-8deg); }
                        75%  { transform: rotate(5deg); }
                        100% { transform: rotate(0deg); }
                    }
                `}</style>

                {/* Mini-dropdown */}
                {bellOpen && (
                    <div className="absolute right-0 top-full mt-1 w-80 bg-white border border-slate-200 rounded-2xl shadow-2xl z-[2200] overflow-hidden">
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-slate-900">Notificaciones</span>
                                <button
                                    onClick={() => playBellSound()}
                                    title="Probar sonido"
                                    className="text-[10px] text-slate-500 hover:text-[#14B8A6] transition-colors flex items-center gap-0.5"
                                >
                                    <Volume2 size={11} /> test
                                </button>
                            </div>
                            {unreadCount > 0 && (
                                <button
                                    onClick={() => AdminNotificationService.markAllRead()}
                                    className="text-[10px] text-[#14B8A6] hover:underline flex items-center gap-1"
                                >
                                    <CheckCheck size={11} /> Marcar todas leídas
                                </button>
                            )}
                        </div>

                        {/* Notification items */}
                        <div className="max-h-72 overflow-y-auto divide-y divide-white/[0.04]">
                            {recentNotifs.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-10 text-slate-600 gap-2">
                                    <Bell size={24} className="opacity-30" />
                                    <p className="text-xs">Sin notificaciones</p>
                                </div>
                            ) : (
                                recentNotifs.map(n => {
                                    const meta = NOTIF_META[n.type] ?? NOTIF_META.system;
                                    const isExpanded = expandedNotifId === n.id;

                                    const handleClick = (e: React.MouseEvent) => {
                                        // Detect double-click via timer
                                        if (clickTimerRef.current) {
                                            clearTimeout(clickTimerRef.current);
                                            clickTimerRef.current = null;
                                            // Double click — navigate to notifications page
                                            setBellOpen(false);
                                            router.push(`/${locale}/admin/notifications`);
                                        } else {
                                            clickTimerRef.current = setTimeout(() => {
                                                clickTimerRef.current = null;
                                                // Single click — expand inline + mark read
                                                if (!n.read) AdminNotificationService.markRead(n.id);
                                                setExpandedNotifId(prev => prev === n.id ? null : n.id);
                                            }, 240);
                                        }
                                    };

                                    return (
                                        <div
                                            key={n.id}
                                            onClick={handleClick}
                                            className={`px-4 py-3 transition-colors cursor-pointer select-none ${n.read ? 'opacity-50' : 'hover:bg-slate-50'
                                                }`}
                                            title="Click: ver detalle · Doble click: ir a Notificaciones"
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className={`w-8 h-8 rounded-lg ${meta.bg} flex items-center justify-center text-base shrink-0 mt-0.5`}>
                                                    {meta.emoji}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-semibold text-slate-900 leading-snug truncate">{n.title}</p>
                                                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed line-clamp-2">{n.body}</p>
                                                    <p className="text-[10px] text-slate-700 mt-1">{relativeTime(n.createdAt)}</p>
                                                </div>
                                                <div className="flex items-center gap-1.5 shrink-0">
                                                    {!n.read && <div className="w-2 h-2 rounded-full bg-[#14B8A6]" />}
                                                    <span className="text-[9px] text-slate-700">{isExpanded ? '▲' : '▼'}</span>
                                                </div>
                                            </div>
                                            {/* Inline expanded detail */}
                                            {isExpanded && (
                                                <div className="mt-2 ml-11 text-[11px] text-slate-400 space-y-0.5 border-t border-slate-200 pt-2">
                                                    {n.relatedName && <p><span className="text-slate-600">Negocio: </span>{n.relatedName}</p>}
                                                    {n.country && <p><span className="text-slate-600">País: </span>{n.country}</p>}
                                                    <p className="text-slate-600 text-[10px] italic">Doble click para ver en la página completa</p>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-4 py-2.5 border-t border-slate-200">
                            <Link
                                href={`/${locale}/admin/notifications`}
                                onClick={() => setBellOpen(false)}
                                className="text-xs text-[#14B8A6] hover:underline"
                            >
                                Ver todas las notificaciones →
                            </Link>
                        </div>
                    </div>
                )}
            </div>

            {/* Admin user + logout */}
            <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#14B8A6] to-[#2563EB] flex items-center justify-center text-black text-xs font-bold">
                    {user?.email?.charAt(0).toUpperCase() ?? 'A'}
                </div>
                <button onClick={handleLogout} title={t('logout')} className="text-slate-500 hover:text-red-400 transition-colors">
                    <LogOut size={15} />
                </button>
            </div>
        </header>
    );
}
