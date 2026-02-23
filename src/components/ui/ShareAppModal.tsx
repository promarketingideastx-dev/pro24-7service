'use client';

import { useState, useCallback } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { X, QrCode, Link2, Copy, Check, Share2, Download } from 'lucide-react';

interface ShareAppModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function ShareAppModal({ isOpen, onClose }: ShareAppModalProps) {
    const t = useTranslations('share');
    const locale = useLocale();
    const [copied, setCopied] = useState(false);
    const [activeTab, setActiveTab] = useState<'qr' | 'share' | 'copy'>('qr');

    // The share URL always carries the current locale so the recipient sees the app in the same language
    const shareUrl = `https://www.pro247ya.com/${locale}`;

    // QR image URL — free API, no key required
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=10&color=0891b2&bgcolor=ffffff&data=${encodeURIComponent(shareUrl)}`;

    const handleCopy = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        } catch {
            // Fallback for browsers without clipboard API
            const el = document.createElement('input');
            el.value = shareUrl;
            document.body.appendChild(el);
            el.select();
            document.execCommand('copy');
            document.body.removeChild(el);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        }
    }, [shareUrl]);

    const handleNativeShare = useCallback(async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Pro24/7YA',
                    text: t('shareText'),
                    url: shareUrl,
                });
            } catch {
                // User cancelled share — do nothing
            }
        } else {
            // Fallback to copy if Web Share API not available
            handleCopy();
        }
    }, [shareUrl, t, handleCopy]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-md bg-[#0f172a] border border-white/10 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">

                {/* Glow accent */}
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />

                {/* Header */}
                <div className="flex items-start justify-between p-6 pb-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Share2 className="w-5 h-5 text-cyan-400" />
                            <h2 className="text-white font-bold text-lg">{t('title')}</h2>
                        </div>
                        <p className="text-slate-400 text-sm">{t('subtitle')}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Tab selector */}
                <div className="flex gap-2 px-6 pb-4">
                    {[
                        { key: 'qr' as const, label: t('qrLabel'), icon: QrCode },
                        { key: 'share' as const, label: t('linkLabel'), icon: Link2 },
                        { key: 'copy' as const, label: t('copyLabel'), icon: Copy },
                    ].map(({ key, label, icon: Icon }) => (
                        <button
                            key={key}
                            onClick={() => setActiveTab(key)}
                            className={`
                                flex-1 flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl text-xs font-semibold transition-all duration-200
                                ${activeTab === key
                                    ? 'bg-cyan-500/20 border border-cyan-400/40 text-cyan-300'
                                    : 'bg-white/5 border border-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/10'
                                }
                            `}
                        >
                            <Icon size={18} />
                            {label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="px-6 pb-6">

                    {/* QR Tab */}
                    {activeTab === 'qr' && (
                        <div className="flex flex-col items-center gap-4">
                            <div className="bg-white rounded-2xl p-4 shadow-lg">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={qrImageUrl}
                                    alt="QR Code"
                                    width={200}
                                    height={200}
                                    className="rounded-lg"
                                />
                            </div>
                            <div className="text-center">
                                <p className="text-white font-semibold text-sm">{t('qrHint')}</p>
                                <p className="text-slate-500 text-xs mt-1 font-mono">{shareUrl}</p>
                            </div>
                            {/* Download QR hint */}
                            <div className="w-full bg-white/5 rounded-2xl p-3 flex items-center gap-3 border border-white/5">
                                <Download size={16} className="text-cyan-400 shrink-0" />
                                <div>
                                    <p className="text-white text-xs font-semibold">{t('downloadTitle')}</p>
                                    <p className="text-slate-500 text-xs">{t('downloadSubtitle')}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Share Link Tab */}
                    {activeTab === 'share' && (
                        <div className="flex flex-col gap-4">
                            <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                                <p className="text-slate-400 text-xs mb-2">{t('linkHint')}</p>
                                <p className="text-cyan-300 text-sm font-mono break-all">{shareUrl}</p>
                            </div>
                            <button
                                onClick={handleNativeShare}
                                className="w-full flex items-center justify-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-white font-bold py-4 px-6 rounded-2xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                            >
                                <Share2 size={18} />
                                {t('linkLabel')}
                            </button>
                        </div>
                    )}

                    {/* Copy Tab */}
                    {activeTab === 'copy' && (
                        <div className="flex flex-col gap-4">
                            <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                                <p className="text-slate-400 text-xs mb-2">{t('copyLabel')}</p>
                                <p className="text-cyan-300 text-sm font-mono break-all">{shareUrl}</p>
                            </div>
                            <button
                                onClick={handleCopy}
                                className={`
                                    w-full flex items-center justify-center gap-2 font-bold py-4 px-6 rounded-2xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]
                                    ${copied
                                        ? 'bg-green-500 text-white'
                                        : 'bg-cyan-500 hover:bg-cyan-400 text-white'
                                    }
                                `}
                            >
                                {copied ? (
                                    <>
                                        <Check size={18} />
                                        {t('copied')}
                                    </>
                                ) : (
                                    <>
                                        <Copy size={18} />
                                        {t('copyLabel')}
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
