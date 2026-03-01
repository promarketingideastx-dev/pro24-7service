'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useAdminContext } from '@/context/AdminContext';
import { AnalyticsService, FunnelStep } from '@/services/analytics.service';
import { TrendingDown, ChevronRight, BarChart2, Clock, Users, Activity, UserPlus } from 'lucide-react';

// Sub-component receives stepLabels at render time so locale changes are reactive
function FunnelBar({ step, maxCount, isTop, label, dropLabel }: {
    step: FunnelStep;
    maxCount: number;
    isTop: boolean;
    label: string;      // translated label passed from parent on every render
    dropLabel: string;
}) {
    const barWidth = maxCount > 0 ? Math.max((step.count / maxCount) * 100, 2) : 0;

    return (
        <div className="group">
            <div className="flex items-center gap-4 py-3 px-4 rounded-xl hover:bg-white/3 transition-colors">
                <div className="w-8 text-lg shrink-0 text-center">{step.emoji}</div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-medium text-slate-900 truncate">{label}</span>
                        <div className="flex items-center gap-3 shrink-0">
                            {!isTop && step.dropPct > 0 && (
                                <span className="flex items-center gap-1 text-[10px] text-red-400">
                                    <TrendingDown size={10} />
                                    -{step.dropPct}%
                                </span>
                            )}
                            <span className="text-xs font-bold text-slate-900">{step.count.toLocaleString()}</span>
                            <span className="text-xs text-slate-500 w-10 text-right">{step.pct}%</span>
                        </div>
                    </div>
                    <div className="h-2 bg-slate-50 rounded-full overflow-hidden">
                        <div
                            className="h-full rounded-full transition-all duration-700 ease-out"
                            style={{
                                width: `${barWidth}%`,
                                background: isTop
                                    ? 'linear-gradient(90deg, #22d3ee, #818cf8)'
                                    : `hsl(${180 - step.pct}, 80%, 55%)`,
                            }}
                        />
                    </div>
                </div>
            </div>
            {!isTop && step.dropPct > 0 && (
                <div className="ml-12 text-[10px] text-red-400/60 flex items-center gap-1 px-4 pb-1">
                    <ChevronRight size={10} className="rotate-90" />
                    {step.dropPct}% {dropLabel}
                </div>
            )}
        </div>
    );
}

export default function AdminFunnelPage() {
    const { selectedCountry } = useAdminContext();
    const t = useTranslations('admin.analytics');

    // Raw steps from service — NOT translated at effect time.
    // Translation happens at render time so locale changes are immediately reactive.
    const [rawSteps, setRawSteps] = useState<FunnelStep[]>([]);
    const [loading, setLoading] = useState(true);
    const [days, setDays] = useState(30);

    // UI Tabs
    const [activeTab, setActiveTab] = useState<'funnel' | 'retention'>('funnel');

    // Retention State
    const [retentionMetrics, setRetentionMetrics] = useState({ totalUsers: 0, activeUsers: 0, newUsers: 0, mauPercentage: 0 });
    const [retentionLoading, setRetentionLoading] = useState(true);

    // Map step.key → t() — evaluated on every render
    const stepLabels: Record<string, string> = {
        profile_view: t('step1'),
        booking_modal_open: t('step2'),
        booking_step_service: t('step3'),
        booking_step_datetime: t('step4'),
        booking_step_contact: t('step5'),
        booking_confirmed: t('step6'),
    };

    const DAY_OPTIONS = [
        { value: 7, label: t('last7days') },
        { value: 30, label: t('last30days') },
        { value: 90, label: t('last90days') },
        { value: 0, label: t('allTime') },
    ];

    useEffect(() => {
        setLoading(true);
        const unsub = AnalyticsService.onFunnelData(
            { country: selectedCountry === 'ALL' ? undefined : selectedCountry, days: days || undefined },
            (data) => {
                setRawSteps(data); // Store RAW — labels translated at render time
                setLoading(false);
            }
        );
        return () => unsub();
    }, [selectedCountry, days]);

    useEffect(() => {
        if (activeTab !== 'retention') return;
        setRetentionLoading(true);
        const unsub = AnalyticsService.onRetentionMetrics(
            { days: days || 30 },
            (data) => {
                setRetentionMetrics(data);
                setRetentionLoading(false);
            }
        );
        return () => unsub();
    }, [activeTab, days]);

    const topCount = rawSteps[0]?.count ?? 0;
    const bottomCount = rawSteps[rawSteps.length - 1]?.count ?? 0;
    const overallConversion = topCount > 0 ? ((bottomCount / topCount) * 100).toFixed(1) : '0.0';

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <BarChart2 size={20} className="text-[#14B8A6]" />
                        {t('title')}
                    </h1>
                    <p className="text-xs text-slate-500 mt-0.5">Resumen de Actividad / Conversión</p>
                </div>
                <div className="flex items-center gap-2">
                    <Clock size={13} className="text-slate-500" />
                    {DAY_OPTIONS.map(opt => (
                        <button key={opt.value} onClick={() => setDays(opt.value)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${days === opt.value
                                ? 'bg-slate-100 border-slate-300 text-white'
                                : 'bg-white/3 border-slate-200 text-slate-400 hover:text-slate-800'
                                }`}>
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-200">
                <button
                    onClick={() => setActiveTab('funnel')}
                    className={`px-4 py-2 font-semibold text-sm rounded-t-xl transition-all ${activeTab === 'funnel' ? 'text-[#14B8A6] border-b-2 border-[#14B8A6] bg-[#14B8A6]/5' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                    Embudo (Funnel)
                </button>
                <button
                    onClick={() => setActiveTab('retention')}
                    className={`px-4 py-2 font-semibold text-sm rounded-t-xl transition-all ${activeTab === 'retention' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                    Retención (Usuarios)
                </button>
            </div>

            {activeTab === 'funnel' ? (
                <>
                    {/* Funnel KPIs */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                            { label: t('step1'), value: topCount.toLocaleString(), icon: '👁️', color: 'text-blue-400' },
                            { label: t('step2'), value: (rawSteps[1]?.count ?? 0).toLocaleString(), icon: '📅', color: 'text-cyan-400' },
                            { label: t('step6'), value: bottomCount.toLocaleString(), icon: '✅', color: 'text-green-400' },
                            { label: t('totalConversion'), value: `${overallConversion}%`, icon: '📊', color: 'text-purple-400' },
                        ].map(kpi => (
                            <div key={kpi.label} className="bg-white/3 border border-slate-200 rounded-xl p-4">
                                <p className="text-xl mb-1">{kpi.icon}</p>
                                <p className={`text-xl font-bold ${kpi.color}`}>{kpi.value}</p>
                                <p className="text-[11px] text-slate-500 mt-0.5">{kpi.label}</p>
                            </div>
                        ))}
                    </div>

                    {/* Funnel Chart */}
                    <div className="bg-white/2 border border-slate-200 rounded-2xl overflow-hidden">
                        {loading ? (
                            <div className="p-12 flex justify-center">
                                <div className="w-6 h-6 border-2 border-slate-200 border-t-[#14B8A6] rounded-full animate-spin" />
                            </div>
                        ) : topCount === 0 ? (
                            <div className="flex flex-col items-center py-20 gap-3 text-slate-500">
                                <BarChart2 size={36} className="opacity-20" />
                                <p className="text-sm">{t('noData')}</p>
                                <p className="text-xs text-slate-600 text-center max-w-xs">{t('noDataHint')}</p>
                            </div>
                        ) : (
                            <div className="py-2">
                                {rawSteps.map((step, i) => (
                                    <FunnelBar
                                        key={step.key}
                                        step={step}
                                        maxCount={topCount}
                                        isTop={i === 0}
                                        label={stepLabels[step.key] ?? step.label}
                                        dropLabel={t('droppedHere')}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    <p className="text-[11px] text-slate-600 text-center">
                        {t('firestoreNote')} <code className="font-mono bg-slate-50 px-1 rounded">analytics_events</code>
                    </p>
                </>
            ) : (
                <>
                    {/* Retention KPIs */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                            { label: 'Total Usuarios', value: retentionLoading ? '...' : retentionMetrics.totalUsers.toLocaleString(), icon: <Users className="text-blue-500" />, color: 'text-slate-900' },
                            { label: `Usuarios Activos (${days}d)`, value: retentionLoading ? '...' : retentionMetrics.activeUsers.toLocaleString(), icon: <Activity className="text-emerald-500" />, color: 'text-slate-900' },
                            { label: `Nuevos Usuarios (${days}d)`, value: retentionLoading ? '...' : retentionMetrics.newUsers.toLocaleString(), icon: <UserPlus className="text-indigo-500" />, color: 'text-slate-900' },
                            { label: 'Retención (Activos/Total)', value: retentionLoading ? '...' : `${retentionMetrics.mauPercentage}%`, icon: <BarChart2 className="text-purple-500" />, color: 'text-slate-900' },
                        ].map(kpi => (
                            <div key={kpi.label} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm relative overflow-hidden">
                                <div className="absolute right-0 top-0 bottom-0 opacity-10 blur-[2px] scale-150 -mr-4">{kpi.icon}</div>
                                <div className="mb-2">{kpi.icon}</div>
                                <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
                                <p className="text-[11px] text-slate-500 mt-1">{kpi.label}</p>
                            </div>
                        ))}
                    </div>

                    <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-6 text-center text-slate-600 mt-4">
                        <Activity className="w-8 h-8 text-indigo-300 mx-auto mb-3" />
                        <h3 className="font-bold text-slate-800 text-sm mb-1">Métricas de Retención</h3>
                        <p className="text-xs">Los usuarios Activos y Nuevos se calculan usando su fecha de último login (`lastLogin`) y fecha de creación (`createdAt`) en base a los últimos {days} días.</p>
                    </div>
                </>
            )}

        </div>
    );
}
