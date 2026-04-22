'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Store, Calendar, CalendarDays, Settings, LogOut, Menu, X, Users, CreditCard, Shield, Bell, MessageCircle, Wallet } from 'lucide-react';
import GlassPanel from '@/components/ui/GlassPanel';
import BusinessGuard from '@/components/auth/BusinessGuard';
import BusinessNotifBell from '@/components/business/BusinessNotifBell';
import TrialWarningBanner from '@/components/business/TrialWarningBanner';
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
    const { user, userProfile } = useAuth();
    const pathname = usePathname();
    const locale = useLocale();
    const t = useTranslations('business.nav');
    const lp = (path: string) => {
        if (path.startsWith(`/${locale}/`) || path === `/${locale}`) return path;
        return `/${locale}${path}`;
    };

    useEffect(() => {
        if (!user) return;
        getDoc(doc(db, 'users', user.uid)).then(snap => {
            if (snap.data()?.isAdmin === true || snap.data()?.roles?.admin === true) setIsAdmin(true);
        });
    }, [user]);

    // Close mobile menu automatically on route change
    useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [pathname]);

    // The setup wizard has its own full-screen layout — skip the shell
    if (pathname === lp('/business/setup') || pathname === '/business/setup') {
        return <BusinessGuard><>{children}</></BusinessGuard>;
    }

    const isMessages = pathname?.includes('/business/messages');

    const menuItems = [
        { name: t('dashboard'), href: lp('/business/dashboard'), icon: <LayoutDashboard size={20} /> },
        { name: t('agenda'), href: lp('/business/bookings'), icon: <Calendar size={20} /> },
        { name: t('calendarView'), href: lp('/business/agenda'), icon: <CalendarDays size={20} /> },
        { name: t('clients'), href: lp('/business/clients'), icon: <Users size={20} /> },
        { name: t('services'), href: lp('/business/services'), icon: <Store size={20} /> },
        { name: t('team'), href: lp('/business/team'), icon: <Users size={20} /> },
        { name: t('paymentsHistory'), href: lp('/business/payments'), icon: <Wallet size={20} /> },
        { name: t('paymentsConfig'), href: lp('/business/dashboard/settings/payments'), icon: <CreditCard size={20} /> },
        { name: t('notifications'), href: lp('/business/notifications'), icon: <Bell size={20} /> },
        { name: t('settings'), href: lp('/business/profile'), icon: <Settings size={20} /> },
    ];

    const isActive = (path: string) => {
        if (path === lp('/business/dashboard')) return pathname === path || pathname === lp('/business');
        return pathname?.startsWith(path);
    };

    return (
        <BusinessGuard>
            <AppointmentRefreshProvider>
                <div className="h-[100dvh] bg-[#F4F6F8] text-slate-900 flex flex-col md:flex-row relative w-full overflow-hidden">

                    {/* Background Ambient Effects (Consistent with Auth) */}
                    <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-500/05 rounded-full blur-[100px] pointer-events-none"></div>
                    <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-500/05 rounded-full blur-[100px] pointer-events-none"></div>

                    {/* Mobile Header */}
                    <div
                        className="md:hidden flex-none flex items-center justify-between px-4 pb-3 bg-white/80 backdrop-blur-md border-b border-slate-200/60 z-[40] shadow-sm transition-all"
                        style={{ paddingTop: 'calc(max(env(safe-area-inset-top), 20px) + 12px)' }}
                    >
                        <div className="flex items-center">
                            <Link href={lp('/business/dashboard')} className="active:scale-95 transition-transform" onClick={() => setIsMobileMenuOpen(false)}>
                                <img src="/logo-header.png" alt="Pro24/7" className="h-9 w-auto object-contain drop-shadow-sm" style={{ maxWidth: '140px' }} />
                            </Link>
                        </div>
                        <div className="flex items-center gap-3">
                            <LanguageSwitcher variant="icon" />
                            {user?.uid && <BusinessNotifBell businessId={user.uid} />}
                            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-slate-500 hover:text-slate-900 transition-colors bg-white rounded-xl border border-slate-200 shadow-sm active:scale-95 z-50">
                                {isMobileMenuOpen ? <X size={22} className="text-red-500" /> : <Menu size={22} className="text-[#14B8A6]" />}
                            </button>
                        </div>
                    </div>

                    {/* Sidebar (Desktop + Mobile Drawer) */}
                    <aside className={`
                    fixed inset-y-0 left-0 z-[60] w-[280px] bg-white/95 backdrop-blur-xl border-r border-slate-200 transform transition-transform duration-300 ease-in-out shadow-2xl md:shadow-none
                    md:sticky md:top-0 md:h-[100dvh] md:translate-x-0 flex flex-col overflow-visible
                    ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
                `}>
                        {/* Header Fixed Area (Desktop exclusively) to stop layout clipping of dropdowns */}
                        <div className="hidden md:flex flex-col gap-4 flex-none px-6 pt-6 pb-2 relative z-[100]">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                    <Link href={lp('/business/dashboard')} className="active:scale-95 transition-transform hover:opacity-80">
                                        <img src="/logo-header.png" alt="Pro24/7" className="h-10 w-auto object-contain" />
                                    </Link>
                                </div>
                                <div className="flex items-center gap-2">
                                    {user?.uid && <BusinessNotifBell businessId={user.uid} />}
                                    <LanguageSwitcher variant="icon" />
                                </div>
                            </div>

                            {/* SWITCH TO CLIENT MODE */}
                            <Link
                                href={lp('/')}
                                className="w-full flex items-center justify-center gap-2 bg-slate-50 hover:bg-[#14B8A6]/10 border border-slate-200 hover:border-[#14B8A6]/30 rounded-xl py-2.5 text-xs font-bold text-slate-600 hover:text-[#0F766E] transition-all shadow-sm"
                            >
                                <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                                {t('clientMode')}
                            </Link>
                        </div>

                        {/* Scrollable Container for Navigation items */}
                        <div className="flex-1 flex flex-col overflow-y-auto no-scrollbar px-4 pt-[calc(max(env(safe-area-inset-top),20px)+20px)] md:pt-4 pb-[calc(env(safe-area-inset-bottom)+24px)] md:pb-6 relative z-10">
                            <nav className="flex-1 space-y-1.5 md:px-2">
                                {menuItems.map((item) => (
                                    <a
                                        key={item.href}
                                        href={item.href}
                                        className={`
                                        flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all group relative font-semibold text-sm
                                        ${isActive(item.href)
                                                ? 'bg-gradient-to-r from-[#14B8A6]/10 to-transparent text-[#0F766E] border-y border-r border-[#14B8A6]/10 shadow-[inset_4px_0_0_#14B8A6]'
                                                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                                            }
                                    `}
                                    >
                                        <span className={isActive(item.href) ? 'text-[#14B8A6] scale-110 transition-transform' : 'text-slate-400 group-hover:text-slate-600 transition-colors'}>
                                            {item.icon}
                                        </span>
                                        <span className="tracking-tight">{item.name}</span>
                                    </a>
                                ))}
                            </nav>

                            {/* Admin CRM — solo visible para admin */}
                            <div className="mt-auto pt-4 md:px-2">
                                {isAdmin && (
                                    <Link
                                        href={lp('/admin/dashboard')}
                                        className="flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all mb-3 bg-gradient-to-br from-slate-800 to-slate-900 hover:from-slate-700 hover:to-slate-800 text-white shadow-lg active:scale-95"
                                    >
                                        <Shield size={18} className="text-[#14B8A6]" />
                                        <span className="font-bold text-sm">Admin CRM</span>
                                        <span className="ml-auto text-[10px] bg-[#14B8A6]/20 text-[#14B8A6] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">DEV</span>
                                    </Link>
                                )}

                                {/* Logout */}
                                <button
                                    onClick={async () => await AuthService.logout()}
                                    className="flex items-center justify-start gap-3 px-4 py-3.5 rounded-xl text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors font-semibold text-sm w-full group"
                                >
                                    <span className="rotate-180 text-slate-400 group-hover:text-red-500 transition-colors"><LogOut size={20} /></span>
                                    <span>{t('logout')}</span>
                                </button>

                                {/* Mobile-only: SWITCH TO CLIENT MODE (At the bottom) */}
                                <Link
                                    href={lp('/')}
                                    className="md:hidden mt-4 w-full flex items-center justify-center gap-2 bg-slate-50 hover:bg-[#14B8A6]/10 border border-slate-200 hover:border-[#14B8A6]/30 rounded-xl py-3.5 text-xs font-bold text-slate-600 hover:text-[#0F766E] transition-all shadow-sm active:scale-95"
                                >
                                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                                    {t('clientMode')}
                                </Link>
                            </div>
                        </div>
                    </aside>

                    {/* Overlay for Mobile */}
                    {isMobileMenuOpen && (
                        <div
                            className="fixed inset-0 bg-slate-900/40 z-[50] md:hidden backdrop-blur-sm transition-opacity"
                            onClick={() => setIsMobileMenuOpen(false)}
                        />
                    )}

                    {/* Main Content Area */}
                    <main className={`flex-1 flex flex-col relative w-full min-w-0 pb-[env(safe-area-inset-bottom)] ${isMessages ? 'p-0 h-[calc(100dvh-70px)] md:h-[100dvh] md:p-4 overflow-hidden' : 'p-0 md:p-8 overflow-y-auto'}`}>
                        <TrialWarningBanner />
                        <div className={`w-full max-w-7xl mx-auto flex-1 p-3 sm:p-4 md:p-0 ${isMessages ? 'h-full flex flex-col' : ''}`}>
                            {((userProfile?.roles as any)?.ceo === true) && !userProfile?.businessProfileId && !userProfile?.isBusinessActive && !userProfile?.roles?.provider ? (
                                <div className="flex flex-col items-center justify-center h-full min-h-[60vh] text-center p-6 animate-in fade-in zoom-in duration-500">
                                    <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6 shadow-[inset_0_2px_10px_rgba(0,0,0,0.05)] border border-slate-200">
                                        <Store className="w-10 h-10 text-slate-400" />
                                    </div>
                                    <h2 className="text-2xl font-bold text-slate-900 mb-3">No tienes un negocio creado</h2>
                                    <p className="text-slate-500 max-w-md mx-auto mb-8 leading-relaxed">
                                        Esta sección es para proveedores. Como CEO, debes crear un negocio desde el flujo oficial si deseas probar como proveedor sin afectar tu identidad central.
                                    </p>
                                    <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto justify-center">
                                        <Link href={lp('/business/setup')} className="px-6 py-3 bg-[#14B8A6] hover:bg-[#0F9488] text-white font-bold rounded-xl shadow-[0_8px_20px_rgba(20,184,166,0.3)] hover:shadow-[0_10px_25px_rgba(20,184,166,0.45)] transition-all active:scale-95 flex items-center justify-center gap-2">
                                            Crear mi negocio
                                        </Link>
                                        <Link href={lp('/admin/dashboard')} className="px-6 py-3 bg-white hover:bg-slate-50 text-slate-700 font-bold rounded-xl border border-slate-200 transition-all active:scale-95 flex items-center justify-center gap-2">
                                            <Shield className="w-4 h-4 text-slate-400" /> Ir a Admin
                                        </Link>
                                    </div>
                                </div>
                            ) : children}
                        </div>
                    </main>
                </div>
            </AppointmentRefreshProvider>
        </BusinessGuard>
    );
}
