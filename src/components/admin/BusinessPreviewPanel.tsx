'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { X, ExternalLink, Building2, RefreshCw, Tablet } from 'lucide-react';

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

    return (
        /* Panel slides in from the right — 900 px wide so the tablet frame has room */
        <div
            className={`fixed top-0 right-0 h-full z-[3000] transition-transform duration-300 ease-in-out ${businessId ? 'translate-x-0' : 'translate-x-full'}`}
            style={{ width: '900px' }}
        >
            {/* Dim click-outside area */}
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

                {/* ── Tablet frame — iPad portrait proportions (3:4) ── */}
                <div className="flex-1 overflow-hidden flex items-center justify-center bg-[#040a16] p-5">
                    {/*
                      iPad portrait  ≈   768 × 1024
                      We cap width at 600px and height fills the panel.
                      3:4 ratio → if height is H, width = H * (3/4).
                      We let the height be `100%` and use CSS aspect-ratio on the
                      bezel so it always looks like a tablet regardless of screen size.
                    */}
                    <div
                        className="flex flex-col bg-[#131927] rounded-[2rem] border-[10px] border-[#1f2937] shadow-[0_0_80px_rgba(0,0,0,0.7)]"
                        style={{
                            /* portrait iPad: 3/4 */
                            aspectRatio: '3 / 4',
                            height: '100%',
                            maxHeight: '100%',
                            maxWidth: '820px',
                        }}
                    >
                        {/* Camera dot — centered top */}
                        <div className="flex items-center justify-center py-3 shrink-0">
                            <div className="w-2.5 h-2.5 rounded-full bg-[#232e42] border border-white/10 shadow-inner" />
                        </div>

                        {/* Screen — fills remaining space */}
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

                        {/* Home bar */}
                        <div className="flex justify-center py-3 shrink-0">
                            <div className="w-20 h-1 rounded-full bg-white/20" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
