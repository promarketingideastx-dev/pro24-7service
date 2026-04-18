'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { X, Building2, User, Phone, Mail, Clock, CalendarDays, ShieldCheck } from 'lucide-react';

interface UserPreviewPanelProps {
    userId: string | null;
    onClose: () => void;
}

const BADGE_STYLE = {
    client: 'bg-blue-500/20 text-blue-500 border-blue-500/30',
    provider: 'bg-[#14B8A6]/20 text-[#14B8A6] border-[#14B8A6]/30',
    vip: 'bg-amber-500/20 text-amber-500 border-amber-500/30',
    trial: 'bg-purple-500/20 text-purple-500 border-purple-500/30',
    expired: 'bg-red-500/20 text-red-500 border-red-500/30',
};

export default function UserPreviewPanel({ userId, onClose }: UserPreviewPanelProps) {
    const [userDoc, setUserDoc] = useState<any>(null);
    const [businessDoc, setBusinessDoc] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const locale = useLocale();

    useEffect(() => {
        if (!userId) { 
            setUserDoc(null); 
            setBusinessDoc(null);
            return; 
        }
        setLoading(true);
        getDoc(doc(db, 'users', userId))
            .then(async d => { 
                if (d.exists()) {
                    const ud = { id: d.id, ...d.data() } as any;
                    setUserDoc(ud); 
                    if (ud.businessProfileId) {
                        try {
                            const bDoc = await getDoc(doc(db, 'businesses_public', ud.businessProfileId));
                            if (bDoc.exists()) setBusinessDoc({ id: bDoc.id, ...bDoc.data() });
                        } catch (e) { console.error('Failed to load linked business', e); }
                    } else {
                        setBusinessDoc(null);
                    }
                } 
            })
            .finally(() => setLoading(false));
    }, [userId]);

    const isProvider = userDoc?.roles?.provider === true;
    const isClient = userDoc?.roles?.client === true;
    const isVip = userDoc?.isVip === true || userDoc?.subscription?.plan === 'vip' || businessDoc?.planData?.plan === 'vip';
    
    let subStatus = userDoc?.subscription?.status || 'active';
    if (subStatus === 'expired' || (userDoc?.subscription?.trialEndAt && userDoc.subscription.trialEndAt < Date.now())) {
        subStatus = 'expired';
    } else if (subStatus === 'trial') {
        subStatus = 'trial';
    }

    const formatDate = (ts: any) => {
        if (!ts) return 'N/A';
        const d = new Date(ts.seconds ? ts.seconds * 1000 : typeof ts === 'number' ? ts : ts);
        return d.toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div
            className={`fixed top-0 right-0 h-full z-[3000] transition-transform duration-300 ease-in-out ${userId ? 'translate-x-0' : 'translate-x-full'}`}
            style={{ width: '900px' }}
        >
            {userId && <div className="fixed inset-0 z-[-1] bg-black/25" onClick={onClose} />}

            <div className="h-full bg-white border-l border-slate-200 flex flex-col shadow-2xl">

                {/* ── Top bar ── */}
                <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-200 shrink-0">
                    <User size={15} className="text-[#14B8A6] shrink-0" />
                    <div className="flex-1 min-w-0">
                        {loading
                            ? <div className="h-4 w-48 bg-slate-100 rounded animate-pulse" />
                            : <p className="text-sm font-semibold text-slate-900 truncate">{userDoc?.displayName || userDoc?.clientProfile?.fullName || 'Usuario Desconocido'}</p>}
                        <p className="text-[10px] text-slate-500">
                            ID: {userId} · {userDoc?.country_code || 'N/A'}
                        </p>
                    </div>
                    <div className="flex items-center gap-1">
                        <button onClick={onClose}
                            className="p-2 text-slate-400 hover:text-red-400 transition-colors">
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* ── Badges info bar ── */}
                {userDoc && (
                    <div className="flex items-center gap-3 px-5 py-2 bg-white/3 border-b border-slate-200 shrink-0 text-xs">
                        {isClient && <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-bold ${BADGE_STYLE.client}`}>CLIENT</span>}
                        {isProvider && <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-bold ${BADGE_STYLE.provider}`}>PROVIDER</span>}
                        {isVip && <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-bold ${BADGE_STYLE.vip}`}>VIP 👑</span>}
                        
                        {isProvider && subStatus === 'expired' && <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-bold ${BADGE_STYLE.expired}`}>TRIAL VENCIDO</span>}
                        {isProvider && subStatus === 'trial' && <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-bold ${BADGE_STYLE.trial}`}>EN PRUEBA</span>}

                        <span className="ml-auto flex items-center gap-1.5 font-semibold text-slate-600">
                            Estado de Cuenta: <span className={userDoc.accountStatus === 'active' ? 'text-green-500' : 'text-slate-400'}>{userDoc.accountStatus || 'active'}</span>
                        </span>
                    </div>
                )}

                {/* ── Contact info bar ── */}
                {userDoc && (
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-5 py-2.5 bg-white/2 border-b border-slate-200 shrink-0">
                        {userDoc.clientProfile?.phone ? (
                            <a href={`tel:${userDoc.clientProfile.phone}`} className="flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-slate-800 transition-colors">
                                <Phone size={11} className="text-[#14B8A6]" />
                                {userDoc.clientProfile.phone}
                            </a>
                        ) : (
                             <span className="flex items-center gap-1.5 text-[11px] text-slate-300">
                                <Phone size={11} /> Sin teléfono
                            </span>
                        )}
                        {userDoc.email && (
                            <a href={`mailto:${userDoc.email}`} className="flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-slate-800 transition-colors">
                                <Mail size={11} className="text-[#14B8A6]" />
                                {userDoc.email}
                            </a>
                        )}
                    </div>
                )}

                {/* ── Content View ── */}
                <div className="flex-1 overflow-y-auto bg-[#F4F6F8] p-5">
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="w-8 h-8 border-2 border-slate-200 border-t-[#14B8A6] rounded-full animate-spin" />
                        </div>
                    ) : userDoc ? (
                        <div className="max-w-2xl mx-auto space-y-6">
                            
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 border-t-4 border-t-[#14B8A6]">
                                <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                                    <ShieldCheck className="text-[#14B8A6]" size={20} />
                                    Ficha de CRM
                                </h3>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                            <p className="text-xs text-slate-400 font-medium mb-1">Nombre Completo</p>
                                            <p className="text-sm text-slate-800 font-semibold">{userDoc.clientProfile?.fullName || '—'}</p>
                                        </div>
                                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                            <p className="text-xs text-slate-400 font-medium mb-1">Email</p>
                                            <p className="text-sm text-slate-800 font-semibold">{userDoc.email}</p>
                                        </div>
                                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                            <p className="text-xs text-slate-400 font-medium mb-1 flex items-center gap-1">
                                                <CalendarDays size={12} /> Fecha de Registro
                                            </p>
                                            <p className="text-sm text-slate-800 font-semibold">{formatDate(userDoc.createdAt)}</p>
                                        </div>
                                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                            <p className="text-xs text-slate-400 font-medium mb-1 flex items-center gap-1">
                                                <Clock size={12} /> Último Acceso
                                            </p>
                                            <p className="text-sm text-slate-800 font-semibold">{formatDate(userDoc.lastLogin)}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {businessDoc && (
                                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                                    <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                                        <Building2 className="text-[#14B8A6]" size={20} />
                                        Negocio Vinculado
                                    </h3>
                                    <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                                        {businessDoc.logoUrl ? (
                                            <img src={businessDoc.logoUrl} className="w-12 h-12 rounded-lg object-cover" alt="Logo" />
                                        ) : (
                                            <div className="w-12 h-12 rounded-lg bg-slate-200 flex items-center justify-center text-xl shrink-0">🏢</div>
                                        )}
                                        <div className="flex-1">
                                            <p className="text-sm font-bold text-slate-900">{businessDoc.name}</p>
                                            <p className="text-xs text-slate-500">ID: {businessDoc.id}</p>
                                        </div>
                                        <div>
                                            <span className="px-3 py-1 bg-white border border-slate-200 rounded-full text-xs font-bold text-slate-600 shadow-sm">
                                                {businessDoc.planData?.plan?.toUpperCase()}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}

                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
