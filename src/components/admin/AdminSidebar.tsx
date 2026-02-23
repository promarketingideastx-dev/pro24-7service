'use client';
import Image from 'next/image';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
    LayoutDashboard, Building2, Users, FileImage,
    Bell, CreditCard, Settings, Scale, BookOpen,
    ChevronLeft, ChevronRight, Map, BarChart2, Crown
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
        // Pending collaborators = new accounts without activatedBy
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
        <aside className={`sticky top-0 h-screen shrink-0 bg-[#0a1128] border-r border-white/5 flex flex-col z-40 transition-all duration-300 ${isOpen ? 'w-64' : 'w-16'}`}>
            {/* Logo */}
            <div className="flex items-center gap-3 px-4 py-5 border-b border-white/5">
                <div className="shrink-0 flex items-center justify-center">
                    <Image
                        src="/logo.png"
                        alt="Pro24/7YA"
                        width={isOpen ? 120 : 36}
                        height={isOpen ? 36 : 36}
                        className="object-contain"
                        priority
                    />
                </div>
                {isOpen && (
                    <p className="text-brand-neon-cyan text-[10px] font-semibold whitespace-nowrap">Admin CRM</p>
                )}
                <button onClick={onToggle} className="ml-auto text-slate-500 hover:text-white transition-colors">
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
                                ? 'bg-brand-neon-cyan/10 text-brand-neon-cyan border border-brand-neon-cyan/20'
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
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
                                            ? 'bg-brand-neon-cyan text-black'
                                            : 'bg-red-500 text-white'
                                            }`}>
                                            {item.badge > 99 ? '99+' : item.badge}
                                        </span>
                                    )}
                                    {active && !hasBadge && (
                                        <span className="w-1.5 h-1.5 rounded-full bg-brand-neon-cyan" />
                                    )}
                                </>
                            )}
                        </Link>
                    );
                })}
            </nav>

            {/* Footer */}
            {isOpen && (
                <div className="p-4 border-t border-white/5">
                    <p className="text-[10px] text-slate-600 text-center">PRO24/7 Admin v1.0</p>
                </div>
            )}
        </aside>
    );
}
