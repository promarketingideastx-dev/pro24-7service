'use client';

import { useState, useEffect } from 'react';
import { X, Smartphone, Download } from 'lucide-react';

// Update these when the app is published to stores
const APP_STORE_URL = 'https://apps.apple.com/app/pro247'; // iOS App Store link
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.pro247'; // Android Play Store link

const DISMISS_KEY = 'pro247_app_banner_dismissed';

function detectPlatform(): 'ios' | 'android' | 'desktop' {
    if (typeof navigator === 'undefined') return 'desktop';
    const ua = navigator.userAgent;
    if (/iPad|iPhone|iPod/.test(ua)) return 'ios';
    if (/Android/.test(ua)) return 'android';
    return 'desktop';
}

function isInstalledPWA(): boolean {
    if (typeof window === 'undefined') return false;
    // @ts-ignore — iOS Safari
    return window.navigator.standalone === true ||
        window.matchMedia('(display-mode: standalone)').matches;
}

interface AppInstallBannerProps {
    businessName?: string;
}

export default function AppInstallBanner({ businessName }: AppInstallBannerProps) {
    const [visible, setVisible] = useState(false);
    const [platform, setPlatform] = useState<'ios' | 'android' | 'desktop'>('desktop');

    useEffect(() => {
        const p = detectPlatform();
        setPlatform(p);

        const dismissed = sessionStorage.getItem(DISMISS_KEY);
        const installed = isInstalledPWA();

        // Show only on mobile that:
        // 1. Is NOT already installed as PWA
        // 2. Has not dismissed this session
        if ((p === 'ios' || p === 'android') && !installed && !dismissed) {
            // Small delay so it doesn't flash during page load
            const t = setTimeout(() => setVisible(true), 1500);
            return () => clearTimeout(t);
        }
    }, []);

    const dismiss = () => {
        sessionStorage.setItem(DISMISS_KEY, '1');
        setVisible(false);
    };

    const storeUrl = platform === 'ios' ? APP_STORE_URL : PLAY_STORE_URL;
    const storeLabel = platform === 'ios' ? 'App Store' : 'Google Play';
    const storeIcon = platform === 'ios' ? '🍎' : '▶';

    if (!visible) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 z-[80] px-4 pb-4 animate-in slide-in-from-bottom-4 duration-500">
            <div className="bg-[#1a1030] border border-brand-neon-cyan/20 rounded-2xl shadow-2xl shadow-black/60 p-4 flex items-center gap-3 relative overflow-hidden">
                {/* Subtle glow bg */}
                <div className="absolute inset-0 bg-gradient-to-r from-brand-neon-cyan/5 to-brand-neon-purple/5 pointer-events-none" />

                {/* App icon */}
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-neon-cyan to-brand-neon-purple flex items-center justify-center shrink-0 shadow-lg shadow-cyan-500/20 relative z-10">
                    <span className="text-2xl font-black text-black">P</span>
                </div>

                {/* Message */}
                <div className="flex-1 min-w-0 relative z-10">
                    <p className="text-white font-bold text-sm leading-tight">
                        PRO24/7 — Servicios Premium
                    </p>
                    <p className="text-slate-400 text-xs mt-0.5 leading-snug">
                        {businessName
                            ? `Abre "${businessName}" en la app para la mejor experiencia`
                            : 'Descarga la app para acceder a todos los negocios'}
                    </p>
                </div>

                {/* CTA */}
                <a
                    href={storeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={dismiss}
                    className="shrink-0 bg-brand-neon-cyan text-black text-xs font-bold px-3 py-2 rounded-xl hover:bg-cyan-300 active:scale-95 transition-all whitespace-nowrap flex items-center gap-1.5 relative z-10"
                >
                    <span>{storeIcon}</span>
                    {storeLabel}
                </a>

                {/* Dismiss */}
                <button
                    onClick={dismiss}
                    className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all relative z-10"
                    aria-label="Cerrar"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
