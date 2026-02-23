'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import GlassPanel from '@/components/ui/GlassPanel';
import CollaboratorGuard from '@/components/ui/CollaboratorGuard';
import AppointmentInbox from '@/components/business/AppointmentInbox';
import { Activity, Users, CalendarCheck, TrendingUp, Loader2, RefreshCw, XCircle, CheckCircle, Link } from 'lucide-react';
import { AppointmentService, Appointment } from '@/services/appointment.service';
import { CustomerService } from '@/services/customer.service';
import { format, startOfMonth, endOfMonth, startOfWeek, addDays, isSameDay, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { useTranslations, useLocale } from 'next-intl';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// ─── Types ──────────────────────────────────────────────────────────────────
interface DashboardStats {
    todayCount: number;
    pendingCount: number;
    clientCount: number;
    monthRevenue: number;
    prevMonthRevenue: number;
    confirmationRate: number;
    weeklyRevenue: { label: string; amount: number }[];
    topServices: { name: string; count: number }[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function buildWeeklyRevenue(appointments: Appointment[]): { label: string; amount: number }[] {
    const now = new Date();
    // Last 8 weeks (Mon–Sun buckets)
    const weeks: { label: string; amount: number }[] = [];
    for (let i = 7; i >= 0; i--) {
        const weekStart = startOfWeek(addDays(now, -i * 7), { weekStartsOn: 1 });
        const weekEnd = addDays(weekStart, 6);
        const label = format(weekStart, 'd MMM', { locale: es });
        const amount = appointments
            .filter(a => {
                const d = a.date.toDate();
                return (a.status === 'confirmed' || a.status === 'completed') &&
                    d >= weekStart && d <= weekEnd;
            })
            .reduce((sum, a) => sum + (a.servicePrice || 0), 0);
        weeks.push({ label, amount });
    }
    return weeks;
}

function buildTopServices(appointments: Appointment[]): { name: string; count: number }[] {
    const map: Record<string, number> = {};
    for (const a of appointments) {
        if (a.status === 'confirmed' || a.status === 'completed') {
            map[a.serviceName] = (map[a.serviceName] || 0) + 1;
        }
    }
    return Object.entries(map)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count]) => ({ name, count }));
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function DashboardPage() {
    const { user } = useAuth();
    const t = useTranslations('business.dashboard');
    const locale = useLocale();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);

    // ── Load planData to feed CollaboratorGuard ──────────────────────────────
    const [planData, setPlanData] = useState<{ planStatus?: string; planSource?: string; pauseReason?: string } | null>(null);

    useEffect(() => {
        if (!user?.uid) return;
        getDoc(doc(db, 'businesses_public', user.uid)).then(snap => {
            if (snap.exists()) {
                const d = snap.data();
                setPlanData({
                    planStatus: d?.planData?.planStatus,
                    planSource: d?.planData?.planSource,
                    pauseReason: d?.collaboratorData?.pauseReason,
                });
            }
        }).catch(() => { });
    }, [user?.uid]);

    const fetchStats = async () => {
        if (!user?.uid) return;
        setLoading(true);
        try {
            const now = new Date();
            const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
            const todayEnd = new Date(now); todayEnd.setHours(23, 59, 59, 999);

            const thisMonthStart = startOfMonth(now);
            const thisMonthEnd = endOfMonth(now);
            const prevMonthStart = startOfMonth(subMonths(now, 1));
            const prevMonthEnd = endOfMonth(subMonths(now, 1));

            const [allApts, pending, customers] = await Promise.all([
                AppointmentService.getAllByBusiness(user.uid),
                AppointmentService.getAppointmentsByStatus(user.uid, 'pending'),
                CustomerService.getCustomers(user.uid),
            ]);

            // Today confirmed
            const todayCount = allApts.filter(a => {
                const d = a.date.toDate();
                return a.status === 'confirmed' && d >= todayStart && d <= todayEnd;
            }).length;

            // Revenue this month
            const monthRevenue = allApts
                .filter(a => {
                    const d = a.date.toDate();
                    return (a.status === 'confirmed' || a.status === 'completed') &&
                        d >= thisMonthStart && d <= thisMonthEnd;
                })
                .reduce((sum, a) => sum + (a.servicePrice || 0), 0);

            // Revenue prev month
            const prevMonthRevenue = allApts
                .filter(a => {
                    const d = a.date.toDate();
                    return (a.status === 'confirmed' || a.status === 'completed') &&
                        d >= prevMonthStart && d <= prevMonthEnd;
                })
                .reduce((sum, a) => sum + (a.servicePrice || 0), 0);

            // Confirmation rate (last 30 days)
            const last30 = allApts.filter(a => {
                const d = a.date.toDate();
                const ago = new Date(); ago.setDate(ago.getDate() - 30);
                return d >= ago;
            });
            const confirmedOrDone = last30.filter(a => a.status === 'confirmed' || a.status === 'completed').length;
            const confirmationRate = last30.length > 0 ? Math.round((confirmedOrDone / last30.length) * 100) : 0;

            setStats({
                todayCount,
                pendingCount: pending.length,
                clientCount: customers.length,
                monthRevenue,
                prevMonthRevenue,
                confirmationRate,
                weeklyRevenue: buildWeeklyRevenue(allApts),
                topServices: buildTopServices(allApts),
            });
        } catch (error) {
            console.error("Error fetching dashboard stats:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchStats(); }, [user]);

    if (!user) return null;

    if (loading || !stats) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-brand-neon-cyan" />
            </div>
        );
    }

    const revenueChange = stats.prevMonthRevenue > 0
        ? Math.round(((stats.monthRevenue - stats.prevMonthRevenue) / stats.prevMonthRevenue) * 100)
        : null;

    const maxWeekRevenue = Math.max(...stats.weeklyRevenue.map(w => w.amount), 1);

    const kpiCards = [
        {
            label: t('todayAppts'),
            value: stats.todayCount.toString(),
            sub: t('confirmed'),
            icon: <CalendarCheck className="w-5 h-5" />,
            color: 'text-cyan-400',
            bg: 'bg-cyan-500/10 border-cyan-500/20',
        },
        {
            label: t('requests'),
            value: stats.pendingCount.toString(),
            sub: t('pending'),
            icon: <Activity className="w-5 h-5" />,
            color: 'text-yellow-400',
            bg: 'bg-yellow-500/10 border-yellow-500/20',
        },
        {
            label: t('clients'),
            value: stats.clientCount.toString(),
            sub: t('registered'),
            icon: <Users className="w-5 h-5" />,
            color: 'text-purple-400',
            bg: 'bg-purple-500/10 border-purple-500/20',
        },
        {
            label: t('monthRevenue'),
            value: `L ${stats.monthRevenue.toLocaleString('es-HN')}`,
            sub: revenueChange !== null
                ? `${revenueChange >= 0 ? '+' : ''}${revenueChange}% ${t('vsLastMonth')}`
                : t('thisMonth'),
            icon: <TrendingUp className="w-5 h-5" />,
            color: stats.monthRevenue > 0 ? 'text-green-400' : 'text-slate-400',
            bg: 'bg-green-500/10 border-green-500/20',
        },
    ];

    return (
        <CollaboratorGuard
            planStatus={planData?.planStatus}
            planSource={planData?.planSource}
            pauseReason={planData?.pauseReason}
        >
            <div className="space-y-6 pb-20">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-white">{t('title')}</h1>
                        <p className="text-slate-400 text-sm">{t('subtitle')}</p>
                    </div>
                    <button
                        onClick={fetchStats}
                        className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm text-white transition-colors border border-white/10 flex items-center gap-2"
                    >
                        <RefreshCw size={14} />
                        {t('refresh')}
                    </button>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {kpiCards.map((card, i) => (
                        <GlassPanel key={i} className={`p-4 flex flex-col gap-3 border ${card.bg} relative overflow-hidden group`}>
                            <div className="flex items-center justify-between">
                                <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">{card.label}</span>
                                <span className={`${card.color} opacity-80`}>{card.icon}</span>
                            </div>
                            <div>
                                <div className={`text-2xl font-bold ${card.color}`}>{card.value}</div>
                                <div className="text-xs text-slate-500 mt-0.5">{card.sub}</div>
                            </div>
                        </GlassPanel>
                    ))}
                </div>

                {/* Main Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Left: Inbox + Chart */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* Income Chart */}
                        <GlassPanel className="p-5">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-base font-bold text-white flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4 text-brand-neon-cyan" />
                                    {t('weeklyRevenue')}
                                </h3>
                                <span className="text-xs text-slate-500">{t('last8Weeks')}</span>
                            </div>

                            {stats.weeklyRevenue.every(w => w.amount === 0) ? (
                                <div className="text-center py-8 text-slate-600 text-sm">
                                    {t('noRevenue')}
                                    <p className="text-xs mt-1 text-slate-700">{t('noRevenueHint')}</p>
                                </div>
                            ) : (
                                <div className="flex items-end gap-1.5 h-40 w-full">
                                    {stats.weeklyRevenue.map((week, i) => {
                                        const heightPct = maxWeekRevenue > 0 ? (week.amount / maxWeekRevenue) * 100 : 0;
                                        const isLast = i === stats.weeklyRevenue.length - 1;
                                        return (
                                            <div key={i} className="flex-1 flex flex-col items-center gap-1 group/bar h-full justify-end">
                                                <div className="text-[9px] text-slate-500 opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap">
                                                    L {week.amount.toLocaleString()}
                                                </div>
                                                <div
                                                    className={`w-full rounded-t-md transition-all ${isLast
                                                        ? 'bg-brand-neon-cyan shadow-[0_0_10px_rgba(0,240,255,0.3)]'
                                                        : 'bg-brand-neon-cyan/30 hover:bg-brand-neon-cyan/50'
                                                        }`}
                                                    style={{ height: `${Math.max(heightPct, 3)}%` }}
                                                />
                                                <div className="text-[9px] text-slate-600 truncate w-full text-center">{week.label}</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </GlassPanel>

                        {/* Appointment Inbox */}
                        <div className="space-y-3">
                            <h3 className="text-base font-bold text-white flex items-center gap-2">
                                <Activity size={18} className="text-brand-neon-cyan" />
                                {t('inbox')}
                            </h3>
                            <AppointmentInbox businessId={user!.uid} />
                        </div>
                    </div>

                    {/* Right Sidebar */}
                    <div className="space-y-5">

                        {/* Confirmation Rate */}
                        <GlassPanel className="p-5">
                            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-green-400" />
                                {t('confirmationRate')}
                                <span className="text-xs text-slate-500 font-normal ml-auto">{t('confirmationRateSub')}</span>
                            </h3>
                            <div className="flex items-center gap-4">
                                <div className="relative w-20 h-20 shrink-0">
                                    <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                                        <circle cx="18" cy="18" r="15.9" fill="none" stroke="#1e2a45" strokeWidth="3" />
                                        <circle
                                            cx="18" cy="18" r="15.9" fill="none"
                                            stroke={stats.confirmationRate >= 70 ? '#22c55e' : stats.confirmationRate >= 40 ? '#f59e0b' : '#ef4444'}
                                            strokeWidth="3"
                                            strokeDasharray={`${stats.confirmationRate} ${100 - stats.confirmationRate}`}
                                            strokeLinecap="round"
                                            className="transition-all duration-1000"
                                        />
                                    </svg>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <span className="text-lg font-bold text-white">{stats.confirmationRate}%</span>
                                    </div>
                                </div>
                                <div className="text-xs text-slate-400 leading-relaxed">
                                    {t('confirmationRateDesc')}
                                </div>
                            </div>
                        </GlassPanel>

                        {/* Top Services */}
                        <GlassPanel className="p-5">
                            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                                <Activity className="w-4 h-4 text-brand-neon-cyan" />
                                {t('topServices')}
                            </h3>
                            {stats.topServices.length === 0 ? (
                                <p className="text-slate-600 text-xs text-center py-4">{t('noData')}</p>
                            ) : (
                                <div className="space-y-3">
                                    {stats.topServices.map((svc, i) => {
                                        const maxCount = stats.topServices[0].count;
                                        const pct = Math.round((svc.count / maxCount) * 100);
                                        return (
                                            <div key={i}>
                                                <div className="flex items-center justify-between text-xs mb-1">
                                                    <span className="text-slate-300 truncate max-w-[80%]">{svc.name}</span>
                                                    <span className="text-slate-500 shrink-0">{svc.count} {t('appts')}</span>
                                                </div>
                                                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-gradient-to-r from-brand-neon-cyan to-blue-500 rounded-full transition-all duration-700"
                                                        style={{ width: `${pct}%` }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </GlassPanel>

                        {/* Quick Actions */}
                        <GlassPanel className="p-5">
                            <h3 className="text-sm font-bold text-white mb-3">{t('quickActions')}</h3>
                            <div className="space-y-2">
                                <a href={`/${locale}/business/clients`} className="w-full p-3 bg-white/5 hover:bg-white/10 rounded-lg text-left text-sm text-slate-300 hover:text-white transition-colors flex items-center gap-3">
                                    <Users size={15} className="text-purple-400" /> {t('viewClients')}
                                </a>
                                <a href={`/${locale}/business/agenda`} className="w-full p-3 bg-white/5 hover:bg-white/10 rounded-lg text-left text-sm text-slate-300 hover:text-white transition-colors flex items-center gap-3">
                                    <CalendarCheck size={15} className="text-cyan-400" /> {t('goToAgenda')}
                                </a>
                            </div>
                        </GlassPanel>
                    </div>
                </div>
            </div>
        </CollaboratorGuard>
    );
}
