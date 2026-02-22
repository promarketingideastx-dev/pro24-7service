'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { X, ExternalLink, Building2, RefreshCw, Tablet, Phone, Mail, Globe } from 'lucide-react';

interface BusinessPreviewPanelProps {
    businessId: string | null;
    onClose: () => void;
}

const PLAN_BADGE: Record<string, string> = {
    free: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
    premium: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    plus_team: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    vip: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
};

const InstagramIcon = () => (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
);
const FacebookIcon = () => (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
);
const TikTokIcon = () => (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.17 8.17 0 004.78 1.52V6.78a4.85 4.85 0 01-1.01-.09z" />
    </svg>
);

export default function BusinessPreviewPanel({ businessId, onClose }: BusinessPreviewPanelProps) {
    const [biz, setBiz] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [iframeKey, setIframeKey] = useState(0);
    const locale = useLocale();

    useEffect(() => {
        if (!businessId) { setBiz(null); return; }
        setLoading(true);
        getDoc(doc(db, 'businesses_public', businessId))
            .then(d => { if (d.exists()) setBiz({ id: d.id, ...d.data() }); })
            .finally(() => setLoading(false));
        setIframeKey(k => k + 1);
    }, [businessId]);

    const profileUrl = businessId ? `/${locale}/negocio/${businessId}` : null;
    const plan = biz?.planData?.plan ?? 'free';
    const statusColor = biz?.suspended ? '#ef4444' : biz?.status === 'pending' ? '#f59e0b' : '#22c55e';
    const statusLabels: Record<string, string> = {
        es: biz?.suspended ? 'Suspendido' : biz?.status === 'pending' ? 'Pendiente' : 'Activo',
        'pt-BR': biz?.suspended ? 'Suspenso' : biz?.status === 'pending' ? 'Pendente' : 'Ativo',
    };
    const statusLabel = statusLabels[locale] ?? statusLabels['es'];

    const social = biz?.socialMedia ?? {};
    const normalizeUrl = (url: string, prefix: string) =>
        url.startsWith('http') ? url : `${prefix}${url}`;

    return (
        <div
            className={`fixed top-0 right-0 h-full z-[3000] transition-transform duration-300 ease-in-out ${businessId ? 'translate-x-0' : 'translate-x-full'}`}
            style={{ width: '900px' }}
        >
            {businessId && <div className="fixed inset-0 z-[-1] bg-black/25" onClick={onClose} />}

            <div className="h-full bg-[#070e20] border-l border-white/10 flex flex-col shadow-2xl">

                {/* ── Top bar ── */}
                <div className="flex items-center gap-3 px-5 py-3 border-b border-white/5 shrink-0">
                    <Tablet size={15} className="text-brand-neon-cyan shrink-0" />
                    <div className="flex-1 min-w-0">
                        {loading
                            ? <div className="h-4 w-48 bg-white/10 rounded animate-pulse" />
                            : <p className="text-sm font-semibold text-white truncate">{biz?.name ?? '—'}</p>}
                        <p className="text-[10px] text-slate-500">
                            {biz?.city ?? ''}{biz?.city && biz?.country ? ', ' : ''}{biz?.country ?? ''}
                        </p>
                    </div>
                    <div className="flex items-center gap-1">
                        {profileUrl && (
                            <a href={profileUrl} target="_blank" rel="noopener noreferrer"
                                className="p-2 text-slate-400 hover:text-brand-neon-cyan transition-colors">
                                <ExternalLink size={14} />
                            </a>
                        )}
                        <button onClick={() => setIframeKey(k => k + 1)}
                            className="p-2 text-slate-400 hover:text-white transition-colors">
                            <RefreshCw size={14} />
                        </button>
                        <button onClick={onClose}
                            className="p-2 text-slate-400 hover:text-red-400 transition-colors">
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* ── Status / plan info bar ── */}
                {biz && (
                    <div className="flex items-center gap-3 px-5 py-2 bg-white/3 border-b border-white/5 shrink-0 text-xs">
                        <span className="flex items-center gap-1.5 font-semibold" style={{ color: statusColor }}>
                            <span className="w-2 h-2 rounded-full" style={{ background: statusColor }} />
                            {statusLabel}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-bold ${PLAN_BADGE[plan]}`}>
                            {plan.toUpperCase()}
                        </span>
                        {biz.category && <span className="text-slate-500 truncate">{biz.category}</span>}
                        <span className="ml-auto text-slate-700 text-[10px]">ID: {businessId?.slice(0, 10)}</span>
                    </div>
                )}

                {/* ── Contact info bar ── */}
                {biz && (
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-5 py-2.5 bg-white/2 border-b border-white/5 shrink-0">
                        {biz.phone && (
                            <a href={`tel:${biz.phone}`} className="flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-white transition-colors">
                                <Phone size={11} className="text-brand-neon-cyan" />
                                {biz.phone}
                            </a>
                        )}
                        {biz.email && (
                            <a href={`mailto:${biz.email}`} className="flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-white transition-colors">
                                <Mail size={11} className="text-brand-neon-cyan" />
                                {biz.email}
                            </a>
                        )}
                        {biz.website && (
                            <a href={!biz.website.startsWith('http') ? `https://${biz.website}` : biz.website}
                                target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-brand-neon-cyan transition-colors">
                                <Globe size={11} className="text-brand-neon-cyan" />
                                {biz.website}
                            </a>
                        )}
                        {social.instagram && (
                            <a href={normalizeUrl(social.instagram, 'https://instagram.com/')}
                                target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-1 text-[11px] text-pink-400/80 hover:text-pink-400 transition-colors">
                                <InstagramIcon />
                                {social.instagram.replace(/^https?:\/\/(www\.)?instagram\.com\//, '@').replace(/\/$/, '')}
                            </a>
                        )}
                        {social.facebook && (
                            <a href={normalizeUrl(social.facebook, 'https://facebook.com/')}
                                target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-1 text-[11px] text-blue-400/80 hover:text-blue-400 transition-colors">
                                <FacebookIcon />
                                Facebook
                            </a>
                        )}
                        {social.tiktok && (
                            <a href={normalizeUrl(social.tiktok, 'https://tiktok.com/@')}
                                target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-1 text-[11px] text-slate-300/80 hover:text-white transition-colors">
                                <TikTokIcon />
                                {social.tiktok.replace(/^@/, '')}
                            </a>
                        )}
                        {!biz.phone && !biz.email && !biz.website && !social.instagram && !social.facebook && !social.tiktok && (
                            <span className="text-[11px] text-slate-700 italic">Sin datos de contacto</span>
                        )}
                    </div>
                )}

                {/* ── Tablet frame ── */}
                <div className="flex-1 overflow-hidden flex items-center justify-center bg-[#040a16] p-5">
                    <div
                        className="flex flex-col bg-[#131927] rounded-[2rem] border-[10px] border-[#1f2937] shadow-[0_0_80px_rgba(0,0,0,0.7)]"
                        style={{ aspectRatio: '3 / 4', height: '100%', maxHeight: '100%', maxWidth: '820px' }}
                    >
                        <div className="flex items-center justify-center py-3 shrink-0">
                            <div className="w-2.5 h-2.5 rounded-full bg-[#232e42] border border-white/10 shadow-inner" />
                        </div>
                        <div className="flex-1 bg-white rounded-xl mx-2 mb-2 overflow-hidden relative min-h-0">
                            {loading ? (
                                <div className="absolute inset-0 flex items-center justify-center bg-white">
                                    <div className="w-9 h-9 border-2 border-slate-100 border-t-brand-neon-cyan rounded-full animate-spin" />
                                </div>
                            ) : profileUrl ? (
                                <iframe
                                    key={iframeKey}
                                    src={profileUrl}
                                    className="w-full h-full border-0"
                                    title={biz?.name ?? 'Business Profile'}
                                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                                />
                            ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 gap-3">
                                    <Building2 size={48} className="opacity-15" />
                                    <p className="text-sm">Haz clic en un marcador del mapa</p>
                                </div>
                            )}
                        </div>
                        <div className="flex justify-center py-3 shrink-0">
                            <div className="w-20 h-1 rounded-full bg-white/20" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
