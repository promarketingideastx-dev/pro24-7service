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

// ─── Bar colors per service rank ─────────────────────────────────────────────
const BAR_COLORS = [
    'bg-[#14B8A6]',   // teal   — #1
    'bg-[#2563EB]',   // blue   — #2
    'bg-[#8B5CF6]',   // purple — #3
    'bg-[#F59E0B]',   // amber  — #4
    'bg-[#EC4899]',   // pink   — #5
];

// ─── Component ───────────────────────────────────────────────────────────────
export default function DashboardPage() {
    const { user } = useAuth();
    const t = useTranslations('business.dashboard');
    const locale = useLocale();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);

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

            const todayCount = allApts.filter(a => {
                const d = a.date.toDate();
                return a.status === 'confirmed' && d >= todayStart && d <= todayEnd;
            }).length;

            const monthRevenue = allApts
                .filter(a => {
                    const d = a.date.toDate();
                    return (a.status === 'confirmed' || a.status === 'completed') &&
                        d >= thisMonthStart && d <= thisMonthEnd;
                })
                .reduce((sum, a) => sum + (a.servicePrice || 0), 0);

            const prevMonthRevenue = allApts
                .filter(a => {
                    const d = a.date.toDate();
                    return (a.status === 'confirmed' || a.status === 'completed') &&
                        d >= prevMonthStart && d <= prevMonthEnd;
                })
                .reduce((sum, a) => sum + (a.servicePrice || 0), 0);

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
                <Loader2 className="w-8 h-8 animate-spin text-[#14B8A6]" />
            </div>
        );
    }

    const revenueChange = stats.prevMonthRevenue > 0
        ? Math.round(((stats.monthRevenue - stats.prevMonthRevenue) / stats.prevMonthRevenue) * 100)
        : null;

    const maxWeekRevenue = Math.max(...stats.weeklyRevenue.map(w => w.amount), 1);

    // ── KPI card definitions ─────────────────────────────────────────────────
    // Each card: wrap = wrapper bg/border, iconColor, valueColor
    const kpiCards = [
        {
            label: t('todayAppts'),
            value: stats.todayCount.toString(),
            sub: t('confirmed'),
            icon: <CalendarCheck className="w-5 h-5" />,
            iconColor: 'text-[#14B8A6]',
            iconBg: 'bg-[rgba(20,184,166,0.12)]',
            valueColor: 'text-slate-900',
            wrap: 'bg-white border border-[#E6E8EC]',
            topAccent: 'bg-[#14B8A6]',
        },
        {
            label: t('requests'),
            value: stats.pendingCount.toString(),
            sub: t('pending'),
            icon: <Activity className="w-5 h-5" />,
            iconColor: 'text-amber-600',
            iconBg: 'bg-amber-50',
            valueColor: stats.pendingCount > 0 ? 'text-amber-600' : 'text-slate-900',
            wrap: stats.pendingCount > 0
                ? 'bg-amber-50 border border-amber-200'
                : 'bg-white border border-[#E6E8EC]',
            topAccent: 'bg-amber-400',
        },
        {
            label: t('clients'),
            value: stats.clientCount.toString(),
            sub: t('registered'),
            icon: <Users className="w-5 h-5" />,
            iconColor: 'text-[#8B5CF6]',
            iconBg: 'bg-purple-50',
            valueColor: 'text-slate-900',
            wrap: 'bg-white border border-[#E6E8EC]',
            topAccent: 'bg-[#8B5CF6]',
        },
        {
            label: t('monthRevenue'),
            value: `L ${stats.monthRevenue.toLocaleString('es-HN')}`,
            sub: revenueChange !== null
                ? `${revenueChange >= 0 ? '+' : ''}${revenueChange}% ${t('vsLastMonth')}`
                : t('thisMonth'),
            icon: <TrendingUp className="w-5 h-5" />,
            iconColor: stats.monthRevenue > 0 ? 'text-green-600' : 'text-slate-400',
            iconBg: stats.monthRevenue > 0 ? 'bg-green-50' : 'bg-slate-100',
            valueColor: stats.monthRevenue > 0 ? 'text-green-700' : 'text-slate-900',
            wrap: 'bg-white border border-[#E6E8EC]',
            topAccent: stats.monthRevenue > 0 ? 'bg-green-400' : 'bg-slate-300',
        },
    ];

    return (
        <CollaboratorGuard
            planStatus={planData?.planStatus}
            planSource={planData?.planSource}
            pauseReason={planData?.pauseReason}
        >
            <div className="space-y-6 pb-20">

                {/* ── Header ─────────────────────────────────────────────── */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">{t('title')}</h1>
                        <p className="text-slate-500 text-sm mt-0.5">{t('subtitle')}</p>
                    </div>
                    <button
                        onClick={fetchStats}
                        className="px-4 py-2 bg-white hover:bg-[#F8FAFC] rounded-lg text-sm text-slate-600 hover:text-slate-900 transition-colors border border-[#E6E8EC] flex items-center gap-2 font-medium"
                    >
                        <RefreshCw size={14} />
                        {t('refresh')}
                    </button>
                </div>

                {/* ── KPI Cards ──────────────────────────────────────────── */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {kpiCards.map((card, i) => (
                        <div
                            key={i}
                            className={`${card.wrap} rounded-2xl p-4 flex flex-col gap-3 relative overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.06)]`}
                        >
                            {/* Top accent stripe */}
                            <div className={`absolute top-0 left-0 right-0 h-1 ${card.topAccent} rounded-t-2xl`} />

                            <div className="flex items-center justify-between pt-1">
                                <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider">{card.label}</span>
                                <span className={`${card.iconColor} ${card.iconBg} p-1.5 rounded-lg`}>{card.icon}</span>
                            </div>
                            <div>
                                <div className={`text-2xl font-bold ${card.valueColor}`}>{card.value}</div>
                                <div className="text-xs text-slate-500 mt-0.5">{card.sub}</div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* ── Main Layout ────────────────────────────────────────── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Left: Inbox + Chart */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* Income Chart */}
                        <div className="bg-white border border-[#E6E8EC] rounded-2xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4 text-[#14B8A6]" />
                                    {t('weeklyRevenue')}
                                </h3>
                                <span className="text-xs text-slate-400">{t('last8Weeks')}</span>
                            </div>

                            {stats.weeklyRevenue.every(w => w.amount === 0) ? (
                                <div className="text-center py-8 text-sm">
                                    <p className="text-slate-500">{t('noRevenue')}</p>
                                    <p className="text-xs mt-1 text-slate-400">{t('noRevenueHint')}</p>
                                </div>
                            ) : (
                                <div className="flex items-end gap-1.5 h-40 w-full">
                                    {stats.weeklyRevenue.map((week, i) => {
                                        const heightPct = maxWeekRevenue > 0 ? (week.amount / maxWeekRevenue) * 100 : 0;
                                        const isLast = i === stats.weeklyRevenue.length - 1;
                                        return (
                                            <div key={i} className="flex-1 flex flex-col items-center gap-1 group/bar h-full justify-end">
                                                <div className="text-[9px] text-slate-400 opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap">
                                                    L {week.amount.toLocaleString()}
                                                </div>
                                                <div
                                                    className={`w-full rounded-t-md transition-all ${isLast
                                                        ? 'bg-[#14B8A6] shadow-[0_0_8px_rgba(20,184,166,0.35)]'
                                                        : 'bg-[rgba(20,184,166,0.25)] hover:bg-[rgba(20,184,166,0.45)]'
                                                        }`}
                                                    style={{ height: `${Math.max(heightPct, 3)}%` }}
                                                />
                                                <div className="text-[9px] text-slate-500 truncate w-full text-center">{week.label}</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Appointment Inbox */}
                        <div className="space-y-3">
                            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                <Activity size={18} className="text-[#14B8A6]" />
                                {t('inbox')}
                            </h3>
                            <AppointmentInbox businessId={user!.uid} />
                        </div>
                    </div>

                    {/* Right Sidebar */}
                    <div className="space-y-5">

                        {/* Confirmation Rate */}
                        <div className="bg-white border border-[#E6E8EC] rounded-2xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
                            <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-green-500" />
                                {t('confirmationRate')}
                                <span className="text-xs text-slate-400 font-normal ml-auto">{t('confirmationRateSub')}</span>
                            </h3>
                            <div className="flex items-center gap-4">
                                <div className="relative w-20 h-20 shrink-0">
                                    <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                                        {/* Track */}
                                        <circle cx="18" cy="18" r="15.9" fill="none" stroke="#E6E8EC" strokeWidth="3" />
                                        {/* Progress */}
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
                                        <span className="text-lg font-bold text-slate-900">{stats.confirmationRate}%</span>
                                    </div>
                                </div>
                                <div className="text-xs text-slate-500 leading-relaxed">
                                    {t('confirmationRateDesc')}
                                </div>
                            </div>
                        </div>

                        {/* Top Services */}
                        <div className="bg-white border border-[#E6E8EC] rounded-2xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
                            <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                                <Activity className="w-4 h-4 text-[#14B8A6]" />
                                {t('topServices')}
                            </h3>
                            {stats.topServices.length === 0 ? (
                                <p className="text-slate-400 text-xs text-center py-4">{t('noData')}</p>
                            ) : (
                                <div className="space-y-3">
                                    {stats.topServices.map((svc, i) => {
                                        const maxCount = stats.topServices[0].count;
                                        const pct = Math.round((svc.count / maxCount) * 100);
                                        return (
                                            <div key={i}>
                                                <div className="flex items-center justify-between text-xs mb-1.5">
                                                    <span className="text-slate-700 font-medium truncate max-w-[80%]">{svc.name}</span>
                                                    <span className="text-slate-400 shrink-0">{svc.count} {t('appts')}</span>
                                                </div>
                                                <div className="h-2 bg-[#F1F5F9] rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full ${BAR_COLORS[i] ?? BAR_COLORS[0]} rounded-full transition-all duration-700`}
                                                        style={{ width: `${pct}%` }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Quick Actions */}
                        <div className="bg-white border border-[#E6E8EC] rounded-2xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
                            <h3 className="text-sm font-bold text-slate-900 mb-3">{t('quickActions')}</h3>
                            <div className="space-y-2">
                                <a
                                    href={`/${locale}/business/clients`}
                                    className="w-full p-3 bg-[#F8FAFC] hover:bg-[rgba(20,184,166,0.08)] border border-transparent hover:border-[#14B8A6]/20 rounded-xl text-left text-sm text-slate-700 hover:text-[#0F766E] font-medium transition-all flex items-center gap-3"
                                >
                                    <Users size={15} className="text-[#8B5CF6]" /> {t('viewClients')}
                                </a>
                                <a
                                    href={`/${locale}/business/agenda`}
                                    className="w-full p-3 bg-[#F8FAFC] hover:bg-[rgba(20,184,166,0.08)] border border-transparent hover:border-[#14B8A6]/20 rounded-xl text-left text-sm text-slate-700 hover:text-[#0F766E] font-medium transition-all flex items-center gap-3"
                                >
                                    <CalendarCheck size={15} className="text-[#14B8A6]" /> {t('goToAgenda')}
                                </a>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </CollaboratorGuard>
    );
}
