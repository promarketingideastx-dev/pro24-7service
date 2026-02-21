'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAdminContext } from '@/context/AdminContext';
import { AdminService } from '@/services/admin.service';
import {
    Building2, Users, TrendingUp, DollarSign,
    Activity, RefreshCw, ShieldAlert, UserCheck,
    Crown, Star, Zap, UsersRound, ArrowUpRight, ArrowDownRight,
    Minus
} from 'lucide-react';
import { toast } from 'sonner';

type Stats = Awaited<ReturnType<typeof AdminService.getDashboardStats>>;

const COUNTRY_FLAGS: Record<string, string> = {
    HN: '🇭🇳', US: '🇺🇸', MX: '🇲🇽', BR: '🇧🇷', GT: '🇬🇹',
    SV: '🇸🇻', CO: '🇨🇴', AR: '🇦🇷', CA: '🇨🇦', ES: '🇪🇸',
    CL: '🇨🇱', PE: '🇵🇪', CR: '🇨🇷', NI: '🇳🇮', PA: '🇵🇦',
};

function KPICard({ icon, label, value, sub, color, trend }: {
    icon: React.ReactNode; label: string; value: string | number;
    sub?: string; color: string; trend?: 'up' | 'down' | 'neutral';
}) {
    return (
        <div className="bg-[#0a1128] border border-white/5 rounded-2xl p-5 flex flex-col gap-3 hover:border-white/10 transition-colors">
            <div className="flex items-center justify-between">
                <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center`}>
                    {icon}
                </div>
                {trend && (
                    <span className={`text-xs font-medium flex items-center gap-0.5 ${trend === 'up' ? 'text-green-400' : trend === 'down' ? 'text-red-400' : 'text-slate-500'}`}>
                        {trend === 'up' ? <ArrowUpRight size={12} /> : trend === 'down' ? <ArrowDownRight size={12} /> : <Minus size={12} />}
                    </span>
                )}
            </div>
            <div>
                <p className="text-3xl font-bold text-white">{value}</p>
                <p className="text-xs text-slate-500 mt-0.5">{label}</p>
            </div>
            {sub && <p className="text-xs text-slate-600 border-t border-white/5 pt-2">{sub}</p>}
        </div>
    );
}

function MiniBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
    const pct = max > 0 ? Math.round((value / max) * 100) : 0;
    return (
        <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 w-20 shrink-0">{label}</span>
            <div className="flex-1 bg-white/5 rounded-full h-1.5">
                <div className={`h-1.5 rounded-full ${color} transition-all duration-700`} style={{ width: `${pct}%` }} />
            </div>
            <span className="text-xs text-slate-400 w-6 text-right">{value}</span>
        </div>
    );
}

export default function AdminDashboardPage() {
    const { selectedCountry } = useAdminContext();
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const data = await AdminService.getDashboardStats(selectedCountry);
            setStats(data);
            setLastUpdated(new Date());
        } catch (e) {
            toast.error('Error cargando estadísticas');
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [selectedCountry]);

    useEffect(() => { load(); }, [load]);

    const formatMRR = (n: number) =>
        n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n}`;

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-2 border-brand-neon-cyan/30 border-t-brand-neon-cyan rounded-full animate-spin" />
        </div>
    );

    const s = stats!;
    const maxPlan = Math.max(...Object.values(s.planCounts));
    const maxCountry = s.topCountries[0]?.count ?? 1;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Activity size={24} className="text-brand-neon-cyan" />
                        Dashboard
                    </h1>
                    <p className="text-slate-500 text-xs mt-0.5">
                        {selectedCountry === 'ALL' ? 'Todos los países' : selectedCountry}
                        {lastUpdated && ` · actualizado ${lastUpdated.toLocaleTimeString('es-HN', { hour: '2-digit', minute: '2-digit' })}`}
                    </p>
                </div>
                <button onClick={load} disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm text-slate-300 transition-colors">
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Actualizar
                </button>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard
                    icon={<Building2 size={20} className="text-cyan-400" />}
                    label="Negocios activos"
                    value={s.activeBusinesses}
                    sub={`${s.newLast30d} nuevos este mes · ${s.newLast7d} esta semana`}
                    color="bg-cyan-500/10"
                    trend={s.newLast7d > 0 ? 'up' : 'neutral'}
                />
                <KPICard
                    icon={<Users size={20} className="text-purple-400" />}
                    label="Usuarios totales"
                    value={s.totalUsers}
                    sub={`${s.providers} proveedores · ${s.newUsers30d} nuevos (30d)`}
                    color="bg-purple-500/10"
                    trend={s.newUsers30d > 0 ? 'up' : 'neutral'}
                />
                <KPICard
                    icon={<DollarSign size={20} className="text-green-400" />}
                    label="MRR Estimado"
                    value={formatMRR(s.mrr)}
                    sub={`${s.planCounts.premium + s.planCounts.plus_team + s.planCounts.vip} suscriptores pagos`}
                    color="bg-green-500/10"
                    trend={s.mrr > 0 ? 'up' : 'neutral'}
                />
                <KPICard
                    icon={<ShieldAlert size={20} className="text-red-400" />}
                    label="Suspendidos"
                    value={s.suspended}
                    sub={`${s.totalBusinesses} negocios totales`}
                    color="bg-red-500/10"
                    trend={s.suspended > 0 ? 'down' : 'neutral'}
                />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

                {/* Plan Distribution */}
                <div className="bg-[#0a1128] border border-white/5 rounded-2xl p-5 col-span-1">
                    <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                        <TrendingUp size={16} className="text-brand-neon-cyan" /> Distribución por Plan
                    </h3>
                    <div className="space-y-3">
                        <MiniBar label="⚡ Free" value={s.planCounts.free ?? 0} max={maxPlan} color="bg-slate-400" />
                        <MiniBar label="⭐ Premium" value={s.planCounts.premium ?? 0} max={maxPlan} color="bg-blue-400" />
                        <MiniBar label="👥 Plus" value={s.planCounts.plus_team ?? 0} max={maxPlan} color="bg-purple-400" />
                        <MiniBar label="👑 VIP" value={s.planCounts.vip ?? 0} max={maxPlan} color="bg-amber-400" />
                    </div>

                    {/* Plan donut summary */}
                    <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-white/5">
                        {[
                            { label: 'Free', val: s.planCounts.free ?? 0, color: 'text-slate-400' },
                            { label: 'Premium', val: s.planCounts.premium ?? 0, color: 'text-blue-400' },
                            { label: 'Plus', val: s.planCounts.plus_team ?? 0, color: 'text-purple-400' },
                            { label: 'VIP', val: s.planCounts.vip ?? 0, color: 'text-amber-400' },
                        ].map(p => (
                            <div key={p.label} className="flex items-center gap-2">
                                <span className={`text-xl font-bold ${p.color}`}>{p.val}</span>
                                <span className="text-xs text-slate-500">{p.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Top Countries */}
                <div className="bg-[#0a1128] border border-white/5 rounded-2xl p-5 col-span-1">
                    <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                        🌍 Por País
                    </h3>
                    {s.topCountries.length === 0 ? (
                        <p className="text-slate-600 text-xs">Sin datos</p>
                    ) : (
                        <div className="space-y-3">
                            {s.topCountries.map(c => (
                                <MiniBar
                                    key={c.code}
                                    label={`${COUNTRY_FLAGS[c.code] ?? '🏳️'} ${c.code}`}
                                    value={c.count}
                                    max={maxCountry}
                                    color="bg-brand-neon-cyan"
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Recent Businesses */}
                <div className="bg-[#0a1128] border border-white/5 rounded-2xl p-5 col-span-1">
                    <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                        <UserCheck size={16} className="text-brand-neon-cyan" /> Negocios Recientes
                    </h3>
                    {s.recent.length === 0 ? (
                        <p className="text-slate-600 text-xs">Sin negocios recientes</p>
                    ) : (
                        <div className="space-y-3">
                            {s.recent.map((b: any) => {
                                const date = b.createdAt?.toDate?.()?.toLocaleDateString('es-HN', { day: 'numeric', month: 'short' });
                                return (
                                    <div key={b.id} className="flex items-center gap-2.5">
                                        {b.coverImage ? (
                                            <img src={b.coverImage} alt="" className="w-7 h-7 rounded-lg object-cover border border-white/10 shrink-0" />
                                        ) : (
                                            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-neon-cyan/20 to-brand-neon-purple/20 flex items-center justify-center text-white font-bold text-[10px] shrink-0">
                                                {b.name?.charAt(0) ?? '?'}
                                            </div>
                                        )}
                                        <div className="min-w-0 flex-1">
                                            <p className="text-xs font-medium text-white truncate">{b.name ?? '—'}</p>
                                            <p className="text-[10px] text-slate-500">{b.city ?? b.country ?? '—'}</p>
                                        </div>
                                        <span className="text-[10px] text-slate-600 shrink-0">{date ?? '—'}</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Quick Stats Bottom Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                    { label: 'Total negocios', value: s.totalBusinesses, icon: <Building2 size={14} />, color: 'text-cyan-400' },
                    { label: 'Proveedores', value: s.providers, icon: <UserCheck size={14} />, color: 'text-purple-400' },
                    { label: 'Nuevos (7d)', value: s.newLast7d, icon: <ArrowUpRight size={14} />, color: 'text-green-400' },
                    { label: 'Sin plan pago', value: s.planCounts.free ?? 0, icon: <Zap size={14} />, color: 'text-slate-400' },
                ].map(item => (
                    <div key={item.label} className="bg-white/3 border border-white/5 rounded-xl px-4 py-3 flex items-center gap-3 hover:bg-white/5 transition-colors">
                        <span className={item.color}>{item.icon}</span>
                        <div>
                            <p className="text-lg font-bold text-white leading-none">{item.value}</p>
                            <p className="text-[10px] text-slate-500 mt-0.5">{item.label}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
