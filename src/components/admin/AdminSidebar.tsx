'use client';
import Image from 'next/image';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
    LayoutDashboard, Building2, Users, FileImage,
    Bell, CreditCard, Settings, Scale, BookOpen,
    ChevronLeft, ChevronRight, Map, BarChart2, Crown, Store, ArrowLeft
} from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { AdminNotificationService } from '@/services/adminNotification.service';
import { DisputeService } from '@/services/dispute.service';

interface AdminSidebarProps {
    isOpen: boolean;
    onToggle: () => void;
}

export default function AdminSidebar({ isOpen, onToggle }: AdminSidebarProps) {
    const pathname = usePathname();
    const locale = useLocale();
    const t = useTranslations('admin.sidebar');
    const [unreadNotifs, setUnreadNotifs] = useState(0);
    const [openDisputes, setOpenDisputes] = useState(0);
    const [pendingCollabs, setPendingCollabs] = useState(0);

    useEffect(() => {
        const unsubN = AdminNotificationService.onUnreadCount(setUnreadNotifs);
        const unsubD = DisputeService.onUnreadCount(setOpenDisputes);
        const { onSnapshot, query, collection, where } = require('firebase/firestore');
        const q = query(
            collection(require('@/lib/firebase').db, 'businesses_public'),
            where('planData.planSource', '==', 'collaborator_beta')
        );
        const unsubC = onSnapshot(q, (snap: any) => {
            const pending = snap.docs.filter((d: any) => !d.data()?.collaboratorData?.activatedBy).length;
            setPendingCollabs(pending);
        });
        return () => { unsubN(); unsubD(); unsubC(); };
    }, []);

    const lp = (path: string) => `/${locale}${path}`;

    const NAV_ITEMS = [
        { href: lp('/admin/dashboard'), icon: LayoutDashboard, label: t('dashboard'), badge: 0 },
        { href: lp('/admin/businesses'), icon: Building2, label: t('businesses'), badge: 0 },
        { href: lp('/admin/users'), icon: Users, label: t('users'), badge: 0 },
        { href: lp('/admin/collaborators'), icon: Crown, label: t('collaborators'), badge: pendingCollabs },
        { href: lp('/admin/map'), icon: Map, label: t('map'), badge: 0 },
        { href: lp('/admin/analytics'), icon: BarChart2, label: t('analytics'), badge: 0 },
        { href: lp('/admin/media'), icon: FileImage, label: t('files'), badge: 0 },
        { href: lp('/admin/notifications'), icon: Bell, label: t('notifications'), badge: unreadNotifs },
        { href: lp('/admin/plans'), icon: CreditCard, label: t('plans'), badge: 0 },
        { href: lp('/admin/disputes'), icon: Scale, label: t('disputes'), badge: openDisputes },
        { href: lp('/admin/audit'), icon: BookOpen, label: t('audit'), badge: 0 },
        { href: lp('/admin/settings'), icon: Settings, label: t('settings'), badge: 0 },
    ];

    return (
        <aside className={`sticky top-0 h-screen shrink-0 bg-white border-r border-slate-200 flex flex-col z-40 transition-all duration-300 ${isOpen ? 'w-64' : 'w-16'}`}>
            {/* Logo */}
            <div className="flex items-center gap-3 px-4 py-5 border-b border-slate-200">
                <div className="shrink-0 flex items-center justify-center">
                    <Image
                        src={isOpen ? "/logo-header.png" : "/icon-192.png"}
                        alt="Pro24/7YA"
                        width={isOpen ? 130 : 36}
                        height={isOpen ? 36 : 36}
                        className="object-contain"
                        priority
                    />
                </div>
                {isOpen && (
                    <p className="text-[#14B8A6] text-[10px] font-semibold whitespace-nowrap">Admin CRM</p>
                )}
                <button onClick={onToggle} className="ml-auto text-slate-500 hover:text-slate-800 transition-colors">
                    {isOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
                </button>
            </div>

            {/* Nav */}
            <nav className="flex-1 py-4 space-y-0.5 px-2 overflow-y-auto">
                {NAV_ITEMS.map(item => {
                    const active = pathname.startsWith(item.href);
                    const hasBadge = item.badge > 0;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group ${active
                                ? 'bg-[#14B8A6]/10 text-[#14B8A6] border border-[#14B8A6]/20'
                                : 'text-slate-400 hover:text-slate-800 hover:bg-slate-50'
                                }`}
                        >
                            <div className="relative shrink-0">
                                <item.icon size={18} />
                                {!isOpen && hasBadge && (
                                    <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none">
                                        {item.badge > 99 ? '99+' : item.badge}
                                    </span>
                                )}
                            </div>

                            {isOpen && (
                                <>
                                    <span className="text-sm font-medium flex-1">{item.label}</span>
                                    {hasBadge && (
                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center leading-none ${active
                                            ? 'bg-[#14B8A6] text-black'
                                            : 'bg-red-500 text-white'
                                            }`}>
                                            {item.badge > 99 ? '99+' : item.badge}
                                        </span>
                                    )}
                                    {active && !hasBadge && (
                                        <span className="w-1.5 h-1.5 rounded-full bg-[#14B8A6]" />
                                    )}
                                </>
                            )}
                        </Link>
                    );
                })}
            </nav>

            {/* Footer — Back to Business + version */}
            <div className="p-3 border-t border-slate-200 space-y-2">
                <Link
                    href={lp('/business/dashboard')}
                    title="Volver a mi Negocio"
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl transition-all w-full
                        bg-emerald-50 hover:bg-emerald-100 text-emerald-700 hover:text-emerald-900 border border-emerald-200"
                >
                    <ArrowLeft size={15} className="shrink-0" />
                    <Store size={16} className="shrink-0" />
                    {isOpen && (
                        <span className="text-sm font-semibold whitespace-nowrap">Volver a mi Negocio</span>
                    )}
                </Link>
                {isOpen && (
                    <p className="text-[10px] text-slate-600 text-center">PRO24/7 Admin v1.0</p>
                )}
            </div>
        </aside>
    );
}
