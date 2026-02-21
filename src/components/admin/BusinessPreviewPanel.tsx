'use client';

import { useEffect, useState } from 'react';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
    X, ExternalLink, Building2, MapPin, Phone,
    Globe, Instagram, Facebook, CreditCard, Shield,
    Smartphone, RefreshCw
} from 'lucide-react';

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

    useEffect(() => {
        if (!businessId) { setBiz(null); return; }
        setLoading(true);
        getDoc(doc(db, 'businesses_public', businessId)).then(d => {
            if (d.exists()) setBiz({ id: d.id, ...d.data() });
        }).finally(() => setLoading(false));
        setIframeKey(k => k + 1); // reload iframe on new business
    }, [businessId]);

    const profileUrl = businessId ? `/negocio/${businessId}` : null;
    const plan = biz?.planData?.plan ?? 'free';
    const statusColor = biz?.suspended ? '#ef4444'
        : biz?.status === 'pending' ? '#f59e0b' : '#22c55e';
    const statusLabel = biz?.suspended ? 'Suspendido'
        : biz?.status === 'pending' ? 'Pendiente' : 'Activo';

    return (
        <div
            className={`fixed top-0 right-0 h-full z-[3000] flex flex-col transition-all duration-300 ease-in-out ${businessId ? 'translate-x-0' : 'translate-x-full'}`}
            style={{ width: '420px' }}
        >
            {/* Backdrop */}
            {businessId && (
                <div className="fixed inset-0 z-[-1]" onClick={onClose} />
            )}

            {/* Panel */}
            <div className="h-full bg-[#0a1128] border-l border-white/10 flex flex-col shadow-2xl">

                {/* Header */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5">
                    <Smartphone size={16} className="text-brand-neon-cyan" />
                    <div className="flex-1 min-w-0">
                        {loading ? (
                            <div className="h-4 w-32 bg-white/10 rounded animate-pulse" />
                        ) : (
                            <p className="text-sm font-semibold text-white truncate">{biz?.name ?? '...'}</p>
                        )}
                        <p className="text-[10px] text-slate-500">{biz?.city ?? ''}{biz?.city && biz?.country ? ', ' : ''}{biz?.country ?? ''}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {profileUrl && (
                            <a href={profileUrl} target="_blank" rel="noopener noreferrer"
                                title="Abrir en nueva pestaña"
                                className="text-slate-400 hover:text-brand-neon-cyan transition-colors">
                                <ExternalLink size={14} />
                            </a>
                        )}
                        <button onClick={() => setIframeKey(k => k + 1)} title="Recargar"
                            className="text-slate-400 hover:text-white transition-colors">
                            <RefreshCw size={14} />
                        </button>
                        <button onClick={onClose} className="text-slate-400 hover:text-red-400 transition-colors ml-1">
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Quick info bar */}
                {biz && (
                    <div className="flex items-center gap-3 px-4 py-2 bg-white/3 border-b border-white/5 text-xs">
                        <span className="flex items-center gap-1" style={{ color: statusColor }}>
                            <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusColor }} />
                            {statusLabel}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold ${PLAN_BADGE[plan]}`}>
                            {plan.toUpperCase()}
                        </span>
                        {biz.category && (
                            <span className="text-slate-500 truncate">{biz.category}</span>
                        )}
                        <span className="ml-auto text-slate-600 text-[10px]">#{businessId?.slice(0, 8)}</span>
                    </div>
                )}

                {/* Phone frame (main content) */}
                <div className="flex-1 overflow-hidden flex items-start justify-center bg-[#060d1f] p-4">
                    <div className="w-full max-w-[360px] mx-auto flex flex-col h-full">
                        {/* Phone bezel */}
                        <div className="bg-[#1a1a2e] rounded-[2.5rem] p-3 flex flex-col flex-1 shadow-2xl border border-white/10">
                            {/* Notch */}
                            <div className="flex items-center justify-center mb-2">
                                <div className="w-20 h-5 bg-black rounded-full flex items-center justify-center gap-1">
                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-700" />
                                    <div className="w-3 h-3 rounded-full bg-slate-800 border border-slate-700" />
                                </div>
                            </div>

                            {/* Screen */}
                            <div className="flex-1 bg-white rounded-[1.8rem] overflow-hidden relative">
                                {loading ? (
                                    <div className="absolute inset-0 flex items-center justify-center bg-white">
                                        <div className="w-8 h-8 border-2 border-slate-200 border-t-brand-neon-cyan rounded-full animate-spin" />
                                    </div>
                                ) : profileUrl ? (
                                    <iframe
                                        key={iframeKey}
                                        src={profileUrl}
                                        className="w-full h-full border-0"
                                        style={{ minHeight: '500px' }}
                                        title={biz?.name ?? 'Business Profile'}
                                        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                                    />
                                ) : (
                                    <div className="absolute inset-0 flex items-center justify-center bg-slate-50">
                                        <div className="text-center text-slate-400">
                                            <Building2 size={32} className="mx-auto mb-2 opacity-30" />
                                            <p className="text-sm">Selecciona un negocio</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Home bar */}
                            <div className="flex items-center justify-center mt-2.5">
                                <div className="w-20 h-1 bg-white/30 rounded-full" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
