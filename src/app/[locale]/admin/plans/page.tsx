'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useAdminContext } from '@/context/AdminContext';
import { onSnapshot, query, collection, limit, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { CreditCard, TrendingUp, Users, Building2, ChevronDown, ChevronUp, Search } from 'lucide-react';
import { PlanService } from '@/services/plan.service';
import { AuditLogService } from '@/services/auditLog.service';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import type { BusinessPlan } from '@/services/plan.service';

const PLANS: BusinessPlan[] = ['free', 'premium', 'plus_team', 'vip'];
const PLAN_COLORS: Record<BusinessPlan, string> = {
    free: 'bg-slate-500/20 text-slate-600 border-slate-500/30',
    premium: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    plus_team: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    vip: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
};
const PLAN_PRICE: Record<BusinessPlan, number> = { free: 0, premium: 9.99, plus_team: 14.99, vip: 49.99 };

interface BusinessRow {
    id: string;
    name: string;
    country: string;
    category: string;
    plan: BusinessPlan;
    planSource: string;
    status: string;
}

export default function PlansPage() {
    const { selectedCountry } = useAdminContext();
    const { user } = useAuth();
    const t = useTranslations('admin.plans');
    const tc = useTranslations('admin.common');
    const [businesses, setBusinesses] = useState<BusinessRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [sortBy, setSortBy] = useState<'name' | 'plan' | 'country'>('plan');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
    const [changingId, setChangingId] = useState<string | null>(null);

    useEffect(() => {
        const q = query(collection(db, 'businesses_public'), limit(500));
        const unsub = onSnapshot(q, snap => {
            let rows: BusinessRow[] = snap.docs.map(d => {
                const data = d.data();
                return {
                    id: d.id,
                    name: data.name ?? '—',
                    country: data.country ?? '—',
                    category: data.category ?? '—',
                    plan: data.planData?.plan ?? 'free',
                    planSource: data.planData?.planSource ?? '—',
                    status: data.suspended ? 'suspended' : (data.status ?? 'active'),
                };
            });
            if (selectedCountry !== 'ALL') rows = rows.filter(r => r.country === selectedCountry);
            setBusinesses(rows);
            setLoading(false);
        }, () => setLoading(false));
        return () => unsub();
    }, [selectedCountry]);

    const filtered = businesses.filter(b =>
        !search || b.name.toLowerCase().includes(search.toLowerCase()) || b.country.toLowerCase().includes(search.toLowerCase())
    ).sort((a, b) => {
        const dir = sortDir === 'asc' ? 1 : -1;
        if (sortBy === 'plan') return (PLANS.indexOf(a.plan) - PLANS.indexOf(b.plan)) * dir;
        if (sortBy === 'country') return a.country.localeCompare(b.country) * dir;
        return a.name.localeCompare(b.name) * dir;
    });

    // KPIs
    const total = businesses.length;
    const byPlan = PLANS.reduce((acc, p) => { acc[p] = businesses.filter(b => b.plan === p).length; return acc; }, {} as Record<BusinessPlan, number>);
    const mrr = PLANS.reduce((sum, p) => sum + byPlan[p] * PLAN_PRICE[p], 0);

    const setPlan = async (businessId: string, bizName: string, newPlan: BusinessPlan) => {
        setChangingId(businessId);
        try {
            await PlanService.setPlan(businessId, newPlan, 'crm_override');
            await AuditLogService.log({
                action: 'business.plan_changed',
                actorUid: user?.uid ?? 'admin',
                actorName: user?.email ?? 'Admin',
                targetId: businessId,
                targetName: bizName,
                targetType: 'business',
                after: { plan: newPlan },
            });
            toast.success(`${bizName} → ${newPlan.toUpperCase()}`);
        } catch {
            toast.error(t('changeError'));
        } finally {
            setChangingId(null);
        }
    };

    const toggleSort = (col: typeof sortBy) => {
        if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortBy(col); setSortDir('asc'); }
    };

    const SortIcon = ({ col }: { col: typeof sortBy }) =>
        sortBy === col ? (sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />) : null;

    return (
        <div className="space-y-4">
            {/* Header */}
            <div>
                <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <CreditCard size={20} className="text-[#14B8A6]" />
                    {t('title')}
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">{t('subtitle')}</p>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="bg-white/3 border border-slate-200 rounded-xl p-4 col-span-2 sm:col-span-1">
                    <p className="text-xl mb-1">🏢</p>
                    <p className="text-xl font-bold text-slate-900">{total}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{t('total')}</p>
                </div>
                {PLANS.map(p => (
                    <div key={p} className="bg-white/3 border border-slate-200 rounded-xl p-4">
                        <p className="text-xl mb-1">{p === 'free' ? '🆓' : p === 'premium' ? '⭐' : p === 'plus_team' ? '💎' : '👑'}</p>
                        <p className="text-xl font-bold text-slate-900">{byPlan[p]}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">{PlanService.PLAN_LABELS[p]}</p>
                    </div>
                ))}
                <div className="bg-[#14B8A6]/5 border border-[#14B8A6]/20 rounded-xl p-4">
                    <p className="text-xl mb-1">💰</p>
                    <p className="text-xl font-bold text-[#14B8A6]">${mrr.toFixed(0)}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">MRR {t('estimated')}</p>
                </div>
            </div>

            {/* Plan Catalog */}
            <div className="mb-8">
                <h2 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-wider">Catálogo Oficial de Planes</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Free */}
                    <div className="bg-white border text-center border-slate-200 rounded-2xl p-6 relative">
                        <div className="absolute top-0 right-0 bg-slate-100 text-slate-600 text-[10px] font-bold px-3 py-1 rounded-bl-xl rounded-tr-2xl uppercase">Básico</div>
                        <h3 className="text-lg font-bold text-slate-900 mb-1">Free</h3>
                        <div className="text-2xl font-black text-slate-900 mb-4">$0 <span className="text-[10px] font-normal text-slate-500">/ siempre</span></div>
                        <ul className="text-xs text-left text-slate-600 space-y-2 mb-6">
                            <li className="flex items-center gap-2"><span>✅</span> Perfil público visible</li>
                            <li className="flex items-center gap-2"><span>✅</span> Máximo 5 servicios</li>
                            <li className="flex items-center gap-2"><span>✅</span> Reservas básicas</li>
                            <li className="flex items-center gap-2"><span>✅</span> 0 empleados</li>
                        </ul>
                    </div>

                    {/* Premium */}
                    <div className="bg-blue-50/50 border border-blue-200 text-center rounded-2xl p-6 relative">
                        <div className="absolute top-0 right-0 bg-blue-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl rounded-tr-2xl uppercase">Recomendado</div>
                        <h3 className="text-lg font-bold text-blue-900 mb-1">Premium</h3>
                        <div className="flex justify-center items-end gap-3 mb-4">
                            <div className="text-2xl font-black text-blue-900">$9.99 <span className="text-[10px] font-normal text-blue-600/70">/ mes</span></div>
                            <div className="text-sm font-bold text-blue-700">$99.99 <span className="text-[9px] font-normal text-blue-600/70">/ año</span></div>
                        </div>
                        <ul className="text-xs text-left text-blue-800 space-y-2 mb-6">
                            <li className="flex items-center gap-2"><span>⭐️</span> Servicios ilimitados</li>
                            <li className="flex items-center gap-2"><span>⭐️</span> Analytics básicos</li>
                            <li className="flex items-center gap-2"><span>⭐️</span> Agenda completa</li>
                            <li className="flex items-center gap-2"><span>⭐️</span> 1 empleado permitido</li>
                            <li className="flex items-center gap-2"><span>⭐️</span> Perfil de negocio premium</li>
                        </ul>
                    </div>

                    {/* Plus */}
                    <div className="bg-purple-50/50 border border-purple-200 text-center rounded-2xl p-6 relative">
                        <div className="absolute top-0 right-0 bg-purple-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl rounded-tr-2xl uppercase">Avanzado</div>
                        <h3 className="text-lg font-bold text-purple-900 mb-1">Plus Equipo</h3>
                        <div className="flex justify-center items-end gap-3 mb-4">
                            <div className="text-2xl font-black text-purple-900">$14.99 <span className="text-[10px] font-normal text-purple-600/70">/ mes</span></div>
                            <div className="text-sm font-bold text-purple-700">$149.99 <span className="text-[9px] font-normal text-purple-600/70">/ año</span></div>
                        </div>
                        <ul className="text-xs text-left text-purple-800 space-y-2 mb-6">
                            <li className="flex items-center gap-2"><span>💎</span> Todo lo de Premium</li>
                            <li className="flex items-center gap-2"><span>💎</span> Hasta 5 empleados permitidos</li>
                            <li className="flex items-center gap-2"><span>💎</span> Agenda colaborativa</li>
                            <li className="flex items-center gap-2"><span>💎</span> Analytics avanzados</li>
                            <li className="flex items-center gap-2"><span>💎</span> Panel de administración de equipo</li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white/2 border border-slate-200 rounded-2xl overflow-hidden">
                {/* Table header */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200">
                    <div className="relative flex-1 max-w-xs">
                        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input value={search} onChange={e => setSearch(e.target.value)}
                            placeholder={tc('search')}
                            className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#14B8A6]/40 w-full" />
                    </div>
                    <span className="text-xs text-slate-500 ml-auto">{filtered.length} {t('businesses')}</span>
                </div>

                {loading ? (
                    <div className="p-12 flex justify-center">
                        <div className="w-6 h-6 border-2 border-slate-200 border-t-[#14B8A6] rounded-full animate-spin" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center py-16 gap-3 text-slate-500">
                        <Building2 size={36} className="opacity-20" />
                        <p className="text-sm">{t('empty')}</p>
                    </div>
                ) : (
                    <>
                        {/* Column headers */}
                        <div className="grid grid-cols-[1fr_80px_80px_160px] gap-4 px-4 py-2 text-[10px] text-slate-600 uppercase tracking-wider border-b border-slate-200">
                            <button className="flex items-center gap-1 text-left hover:text-slate-800 transition-colors" onClick={() => toggleSort('name')}>
                                {t('business')} <SortIcon col="name" />
                            </button>
                            <button className="flex items-center gap-1 hover:text-slate-800 transition-colors" onClick={() => toggleSort('country')}>
                                {tc('country')} <SortIcon col="country" />
                            </button>
                            <button className="flex items-center gap-1 hover:text-slate-800 transition-colors" onClick={() => toggleSort('plan')}>
                                {t('plan')} <SortIcon col="plan" />
                            </button>
                            <span>{t('changePlan')}</span>
                        </div>

                        {/* Rows */}
                        <div className="divide-y divide-white/5 max-h-[480px] overflow-y-auto">
                            {filtered.map(biz => (
                                <div key={biz.id} className="grid grid-cols-[1fr_80px_80px_160px] gap-4 px-4 py-3 items-center hover:bg-white/3 transition-colors">
                                    <div className="min-w-0">
                                        <p className="text-sm text-slate-900 font-medium truncate">{biz.name}</p>
                                        <p className="text-[10px] text-slate-600 truncate">{biz.category}</p>
                                    </div>
                                    <span className="text-xs text-slate-400">{biz.country}</span>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border self-start mt-0.5 ${PLAN_COLORS[biz.plan]}`}>
                                        {biz.plan.toUpperCase()}
                                    </span>
                                    <div className="flex gap-1 flex-wrap">
                                        {PLANS.filter(p => p !== biz.plan).map(p => (
                                            <button key={p} onClick={() => setPlan(biz.id, biz.name, p)}
                                                disabled={changingId === biz.id}
                                                className={`text-[9px] font-bold px-1.5 py-0.5 rounded border transition-all hover:scale-105 disabled:opacity-50 ${PLAN_COLORS[p]}`}>
                                                {p.toUpperCase()}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
