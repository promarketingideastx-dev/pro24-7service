'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/context/AuthContext';
import { AdminService, AdminBusinessRecord } from '@/services/admin.service';
import { useAdminContext } from '@/context/AdminContext';
import { BusinessPlan } from '@/types/firestore-schema';
import {
    Building2, Search, RefreshCw, ChevronDown,
    CheckCircle, XCircle, Crown, Zap, Users, Star
} from 'lucide-react';
import { toast } from 'sonner';

// Plan helpers (using PLAN_LABELS directly from PlanService)
const PLAN_LABEL: Record<BusinessPlan, string> = {
    free: 'Free',
    premium: 'Premium',
    plus_team: 'Plus Equipo',
    vip: 'VIP',
};

const PLAN_OPTIONS: { value: BusinessPlan; label: string; color: string }[] = [
    { value: 'free', label: 'Free', color: 'text-slate-400' },
    { value: 'premium', label: 'Premium', color: 'text-blue-400' },
    { value: 'plus_team', label: 'Plus Equipo', color: 'text-purple-400' },
    { value: 'vip', label: 'VIP', color: 'text-amber-400' },
];

const PLAN_ICONS: Record<BusinessPlan, React.ReactNode> = {
    free: <Zap size={12} className="text-slate-400" />,
    premium: <Star size={12} className="text-blue-400" />,
    plus_team: <Users size={12} className="text-purple-400" />,
    vip: <Crown size={12} className="text-amber-400" />,
};

const PLAN_BADGE: Record<BusinessPlan, string> = {
    free: 'bg-slate-500/20 text-slate-400 border-slate-500/20',
    premium: 'bg-blue-500/20 text-blue-400 border-blue-500/20',
    plus_team: 'bg-purple-500/20 text-purple-400 border-purple-500/20',
    vip: 'bg-amber-500/20 text-amber-400 border-amber-500/20',
};

function PlanDropdown({ business, onChanged }: { business: AdminBusinessRecord; onChanged: () => void }) {
    const { user } = useAuth();
    const [open, setOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [pos, setPos] = useState({ top: 0, left: 0 });
    const btnRef = useRef<HTMLButtonElement>(null);
    const currentPlan = (business.planData?.plan ?? 'free') as BusinessPlan;

    // Close on click outside (anywhere in document)
    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => setOpen(false);
        // Use capture so it fires before stopPropagation
        document.addEventListener('click', handler, true);
        return () => document.removeEventListener('click', handler, true);
    }, [open]);

    const handleToggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!open && btnRef.current) {
            const rect = btnRef.current.getBoundingClientRect();
            setPos({ top: rect.bottom + 4, left: rect.left });
        }
        setOpen(p => !p);
    };

    const handleSet = async (plan: BusinessPlan) => {
        if (plan === currentPlan) { setOpen(false); return; }
        setSaving(true);
        setOpen(false);
        try {
            await AdminService.setPlan(business.id, plan, user?.email ?? 'admin');
            toast.success(`Plan actualizado → ${PLAN_LABEL[plan]}`);
            onChanged();
        } catch {
            toast.error('Error actualizando plan');
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <button
                ref={btnRef}
                onClick={handleToggle}
                disabled={saving}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all ${PLAN_BADGE[currentPlan]} hover:opacity-80`}
            >
                {PLAN_ICONS[currentPlan]}
                <span>{PLAN_LABEL[currentPlan]}</span>
                <ChevronDown size={10} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && (
                <div
                    style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999 }}
                    className="bg-[#0f1a2e] border border-white/10 rounded-xl shadow-2xl w-40 overflow-hidden"
                    onClick={e => e.stopPropagation()}
                >
                    {PLAN_OPTIONS.map(opt => (
                        <button
                            key={opt.value}
                            onClick={() => handleSet(opt.value)}
                            className={`w-full text-left px-3 py-2.5 text-xs flex items-center gap-2 hover:bg-white/5 transition-colors ${opt.color} ${currentPlan === opt.value ? 'bg-white/5 font-bold' : ''}`}
                        >
                            {PLAN_ICONS[opt.value]}
                            {opt.label}
                            {currentPlan === opt.value && <CheckCircle size={10} className="ml-auto" />}
                        </button>
                    ))}
                </div>
            )}
        </>
    );
}

export default function AdminBusinessesPage() {
    const { selectedCountry } = useAdminContext();
    const t = useTranslations('admin.businesses');
    const tc = useTranslations('admin.common');
    const [businesses, setBusinesses] = useState<AdminBusinessRecord[]>([]);
    const [filtered, setFiltered] = useState<AdminBusinessRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [planFilter, setPlanFilter] = useState<string>('all');

    const load = useCallback(async () => {
        setLoading(true);
        try {
            // Pass the country filter from global context
            const data = await AdminService.getBusinesses(selectedCountry);
            setBusinesses(data);
            setFiltered(data);
        } catch (e) {
            toast.error('Error cargando negocios');
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [selectedCountry]);

    // Reload when country filter changes
    useEffect(() => { load(); }, [load]);

    // Local filters (search + plan)
    useEffect(() => {
        let result = businesses;
        if (search.trim()) {
            const q = search.toLowerCase();
            result = result.filter(b =>
                b.name?.toLowerCase().includes(q) ||
                b.email?.toLowerCase().includes(q) ||
                b.phone?.includes(q) ||
                b.city?.toLowerCase().includes(q)
            );
        }
        if (planFilter !== 'all') {
            result = result.filter(b => (b.planData?.plan ?? 'free') === planFilter);
        }
        setFiltered(result);
    }, [search, planFilter, businesses]);

    const handleSuspend = async (b: AdminBusinessRecord) => {
        try {
            await AdminService.suspendBusiness(b.id, !b.suspended);
            toast.success(b.suspended ? 'Negocio reactivado' : 'Negocio suspendido');
            load();
        } catch {
            toast.error('Error');
        }
    };

    // Plan counts
    const counts = businesses.reduce((acc, b) => {
        const p = b.planData?.plan ?? 'free';
        acc[p] = (acc[p] ?? 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    return (
        <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Building2 size={24} className="text-brand-neon-cyan" />
                        {t('title')}
                    </h1>
                    <p className="text-slate-400 text-sm mt-0.5">
                        {businesses.length} {t('title').toLowerCase()}
                        {selectedCountry !== 'ALL' && <span> en {selectedCountry}</span>}
                    </p>
                </div>
                <button onClick={load} disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm text-slate-300 transition-colors">
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    {tc('refresh')}
                </button>
            </div>

            {/* Plan Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                {PLAN_OPTIONS.map(opt => (
                    <button
                        key={opt.value}
                        onClick={() => setPlanFilter(planFilter === opt.value ? 'all' : opt.value)}
                        className={`p-4 rounded-xl border transition-all text-left ${planFilter === opt.value ? `${PLAN_BADGE[opt.value]} border-current` : 'bg-white/3 border-white/8 hover:border-white/15'}`}
                    >
                        <div className="flex items-center gap-2 mb-1">
                            {PLAN_ICONS[opt.value]}
                            <span className={`text-xs font-semibold ${opt.color}`}>{opt.label}</span>
                        </div>
                        <p className="text-2xl font-bold text-white">{counts[opt.value] ?? 0}</p>
                    </button>
                ))}
            </div>

            {/* Search */}
            <div className="mb-4">
                <div className="relative">
                    <Search size={14} className="absolute left-3 top-2.5 text-slate-500" />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder={t('searchPlaceholder')}
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-9 pr-4 text-sm text-white focus:outline-none focus:border-brand-neon-cyan/50"
                    />
                </div>
            </div>

            {/* Table */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="w-8 h-8 border-2 border-brand-neon-cyan/30 border-t-brand-neon-cyan rounded-full animate-spin" />
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-16 text-slate-500">{t('notFound')}</div>
            ) : (
                <div className="bg-[#0a1128] border border-white/5 rounded-2xl">
                    <div className="overflow-x-auto rounded-2xl">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-white/5 text-xs text-slate-500 uppercase">
                                    <th className="text-left px-4 py-3">{t('name')}</th>
                                    <th className="text-left px-4 py-3">{t('countryCity')}</th>
                                    <th className="text-left px-4 py-3">{t('category')}</th>
                                    <th className="text-left px-4 py-3">{t('plan')}</th>
                                    <th className="text-left px-4 py-3">{t('status')}</th>
                                    <th className="text-left px-4 py-3">{t('registration')}</th>
                                    <th className="text-right px-4 py-3">{tc('actions')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filtered.map(b => {
                                    const isSuspended = b.suspended === true;
                                    const plan = (b.planData?.plan ?? 'free') as BusinessPlan;
                                    const createdDate = b.createdAt?.toDate?.()?.toLocaleDateString('es-HN', {
                                        day: 'numeric', month: 'short', year: 'numeric'
                                    });

                                    return (
                                        <tr key={b.id} className={`hover:bg-white/3 transition-colors ${isSuspended ? 'opacity-50' : ''}`}>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    {b.coverImage ? (
                                                        <img src={b.coverImage} alt="" className="w-8 h-8 rounded-lg object-cover border border-white/10" />
                                                    ) : (
                                                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-neon-cyan/20 to-brand-neon-purple/20 flex items-center justify-center text-white font-bold text-xs border border-white/10">
                                                            {b.name?.charAt(0) ?? '?'}
                                                        </div>
                                                    )}
                                                    <div>
                                                        <p className="text-sm font-medium text-white truncate max-w-[180px]">{b.name ?? '—'}</p>
                                                        <p className="text-xs text-slate-500 truncate max-w-[180px]">{b.email ?? b.phone ?? '—'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <p className="text-sm text-slate-300">{b.country ?? '—'}</p>
                                                <p className="text-xs text-slate-500">{b.city ?? ''}</p>
                                            </td>
                                            <td className="px-4 py-3 text-xs text-slate-400">{b.category ?? '—'}</td>
                                            <td className="px-4 py-3">
                                                <PlanDropdown business={b} onChanged={load} />
                                            </td>
                                            <td className="px-4 py-3">
                                                {isSuspended ? (
                                                    <span className="flex items-center gap-1 text-xs text-red-400">
                                                        <XCircle size={12} /> {t('suspended')}
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-1 text-xs text-green-400">
                                                        <CheckCircle size={12} /> {t('active')}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-xs text-slate-500">{createdDate ?? '—'}</td>
                                            <td className="px-4 py-3 text-right">
                                                <button
                                                    onClick={() => handleSuspend(b)}
                                                    className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${isSuspended
                                                        ? 'border-green-500/30 text-green-400 hover:bg-green-500/10'
                                                        : 'border-red-500/30 text-red-400 hover:bg-red-500/10'}`}
                                                >
                                                    {isSuspended ? t('reactivate') : t('suspend')}
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
