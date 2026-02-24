'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Store, Calendar, Settings, LogOut, Menu, X, Users, CreditCard, Shield, Bell } from 'lucide-react';
import GlassPanel from '@/components/ui/GlassPanel';
import BusinessGuard from '@/components/auth/BusinessGuard';
import BusinessNotifBell from '@/components/business/BusinessNotifBell';
import { AuthService } from '@/services/auth.service';
import { AppointmentRefreshProvider } from '@/context/AppointmentRefreshContext';
import { useAuth } from '@/context/AuthContext';
import { useLocale, useTranslations } from 'next-intl';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import LanguageSwitcher from '@/components/ui/LanguageSwitcher';

export default function BusinessShell({ children }: { children: React.ReactNode }) {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const { user } = useAuth();
    const pathname = usePathname();
    const locale = useLocale();
    const t = useTranslations('business.nav');
    const lp = (path: string) => `/${locale}${path}`;

    useEffect(() => {
        if (!user) return;
        getDoc(doc(db, 'users', user.uid)).then(snap => {
            if (snap.data()?.isAdmin === true) setIsAdmin(true);
        });
    }, [user]);

    // The setup wizard has its own full-screen layout — skip the shell
    if (pathname === lp('/business/setup') || pathname === '/business/setup') {
        return <>{children}</>;
    }

    const menuItems = [
        { name: t('dashboard'), href: lp('/business/dashboard'), icon: <LayoutDashboard size={20} /> },
        { name: t('agenda'), href: lp('/business/agenda'), icon: <Calendar size={20} /> },
        { name: t('clients'), href: lp('/business/clients'), icon: <Users size={20} /> },
        { name: t('services'), href: lp('/business/services'), icon: <Store size={20} /> },
        { name: t('team'), href: lp('/business/team'), icon: <Users size={20} /> },
        { name: t('payments'), href: lp('/business/dashboard/settings/payments'), icon: <CreditCard size={20} /> },
        { name: t('notifications'), href: lp('/business/notifications'), icon: <Bell size={20} /> },
        { name: t('settings'), href: lp('/business/profile'), icon: <Settings size={20} /> },
    ];

    const isActive = (path: string) => pathname === path;

    return (
        <BusinessGuard>
            <AppointmentRefreshProvider>
                <div className="min-h-screen bg-[#F4F6F8] text-slate-900 flex flex-col md:flex-row relative overflow-hidden">

                    {/* Background Ambient Effects (Consistent with Auth) */}
                    <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-500/05 rounded-full blur-[100px] pointer-events-none"></div>
                    <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-500/05 rounded-full blur-[100px] pointer-events-none"></div>

                    {/* Mobile Header */}
                    <div className="md:hidden flex items-center justify-between p-4 bg-white/90 backdrop-blur-md border-b border-slate-200 z-50 sticky top-0">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-400 to-blue-500 flex items-center justify-center">
                                <span className="font-bold text-xs text-black">P24</span>
                            </div>
                            <span className="font-bold text-sm">Provider Panel</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <LanguageSwitcher variant="icon" />
                            {user?.uid && <BusinessNotifBell businessId={user.uid} />}
                            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-slate-500 hover:text-slate-900">
                                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                            </button>
                        </div>
                    </div>

                    {/* Sidebar (Desktop + Mobile Drawer) */}
                    <aside className={`
                    fixed inset-y-0 left-0 z-40 w-64 bg-white/95 backdrop-blur-xl border-r border-slate-200 transform transition-transform duration-300 ease-in-out
                    md:relative md:translate-x-0
                    ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
                `}>
                        <div className="flex flex-col h-full p-6">
                            {/* Logo (Desktop) */}
                            <div className="hidden md:flex flex-col gap-4 mb-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-400 to-blue-500 flex items-center justify-center shadow-[0_0_15px_rgba(0,240,255,0.3)]">
                                            <span className="font-extrabold text-sm text-black">P24</span>
                                        </div>
                                        <div>
                                            <h1 className="font-bold text-lg leading-none text-slate-900">PRO24/7</h1>
                                            <span className="text-[10px] text-[#14B8A6] font-semibold tracking-wider uppercase">Business</span>
                                        </div>
                                    </div>
                                    <LanguageSwitcher variant="icon" />
                                </div>

                                {/* SWITCH TO CLIENT MODE */}
                                <Link
                                    href={lp('/')}
                                    className="w-full flex items-center justify-center gap-2 bg-[#F8FAFC] hover:bg-white border border-[#E6E8EC] hover:border-[#14B8A6]/30 rounded-lg py-2 text-xs font-semibold text-slate-600 hover:text-[#0F766E] transition-all"
                                >
                                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                                    {t('clientMode')}
                                </Link>
                            </div>

                            {/* Navigation */}
                            <nav className="flex-1 space-y-2">
                                {menuItems.map((item) => (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        onClick={() => setIsMobileMenuOpen(false)}
                                        className={`
                                        flex items-center gap-3 px-4 py-3 rounded-xl transition-all group relative
                                        ${isActive(item.href)
                                                ? 'bg-[rgba(20,184,166,0.10)] text-[#0F766E] border border-[#14B8A6]/25'
                                                : 'text-slate-600 hover:bg-[#F8FAFC] hover:text-slate-900'
                                            }
                                    `}
                                    >
                                        {/* Left accent bar for active */}
                                        {isActive(item.href) && (
                                            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-[#14B8A6] rounded-r-full" />
                                        )}
                                        <span className={isActive(item.href) ? 'text-[#14B8A6]' : 'text-slate-400 group-hover:text-slate-700'}>
                                            {item.icon}
                                        </span>
                                        <span className="font-semibold text-sm">{item.name}</span>
                                    </Link>
                                ))}
                            </nav>

                            {/* Admin CRM — solo visible para admin */}
                            {isAdmin && (
                                <Link
                                    href={lp('/admin/dashboard')}
                                    className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all mb-2 bg-[#14B8A6] hover:bg-[#0F9488] text-white shadow-[0_4px_12px_rgba(20,184,166,0.30)]"
                                >
                                    <Shield size={18} className="text-white" />
                                    <span className="font-bold text-sm">Admin CRM</span>
                                    <span className="ml-auto text-[9px] bg-white/25 text-white px-1.5 py-0.5 rounded-full font-bold">ADMIN</span>
                                </Link>
                            )}

                            {/* Logout */}
                            <button
                                onClick={async () => await AuthService.logout()}
                                className="mt-auto flex items-center gap-3 px-4 py-3 rounded-xl text-slate-500 hover:bg-red-50 hover:text-red-500 transition-colors font-medium text-sm"
                            >
                                <span className="rotate-180"><LogOut size={20} /></span>
                                <span className="font-medium text-sm">{t('logout')}</span>
                            </button>
                        </div>
                    </aside>

                    {/* Overlay for Mobile */}
                    {isMobileMenuOpen && (
                        <div
                            className="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm"
                            onClick={() => setIsMobileMenuOpen(false)}
                        />
                    )}

                    {/* Main Content Area */}
                    <main className="flex-1 overflow-y-auto h-[calc(100vh-64px)] md:h-screen p-4 md:p-8 relative z-10 custom-scrollbar">
                        <div className="max-w-6xl mx-auto">
                            {children}
                        </div>
                    </main>
                </div>
            </AppointmentRefreshProvider>
        </BusinessGuard>
    );
}
