'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
    LayoutDashboard, Building2, Users, FileImage,
    Bell, CreditCard, Settings, Scale, BookOpen,
    ChevronLeft, ChevronRight, Shield
} from 'lucide-react';

interface AdminSidebarProps {
    isOpen: boolean;
    onToggle: () => void;
}

const NAV_ITEMS = [
    { href: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/admin/businesses', icon: Building2, label: 'Negocios' },
    { href: '/admin/users', icon: Users, label: 'Usuarios' },
    { href: '/admin/media', icon: FileImage, label: 'Archivos' },
    { href: '/admin/notifications', icon: Bell, label: 'Notificaciones' },
    { href: '/admin/plans', icon: CreditCard, label: 'Planes & Pagos' },
    { href: '/admin/disputes', icon: Scale, label: 'Disputas' },
    { href: '/admin/audit', icon: BookOpen, label: 'Audit Log' },
    { href: '/admin/settings', icon: Settings, label: 'Configuración' },
];

export default function AdminSidebar({ isOpen, onToggle }: AdminSidebarProps) {
    const pathname = usePathname();

    return (
        <aside className={`fixed left-0 top-0 h-full bg-[#0a1128] border-r border-white/5 flex flex-col z-40 transition-all duration-300 ${isOpen ? 'w-64' : 'w-16'}`}>
            {/* Logo */}
            <div className="flex items-center gap-3 px-4 py-5 border-b border-white/5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-neon-cyan to-brand-neon-purple flex items-center justify-center shrink-0">
                    <Shield size={16} className="text-black" />
                </div>
                {isOpen && (
                    <div>
                        <p className="text-white font-bold text-sm leading-none">PRO24/7</p>
                        <p className="text-brand-neon-cyan text-[10px] font-semibold mt-0.5">Admin CRM</p>
                    </div>
                )}
                <button
                    onClick={onToggle}
                    className="ml-auto text-slate-500 hover:text-white transition-colors"
                >
                    {isOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
                </button>
            </div>

            {/* Nav */}
            <nav className="flex-1 py-4 space-y-1 px-2 overflow-y-auto">
                {NAV_ITEMS.map(item => {
                    const active = pathname.startsWith(item.href);
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group ${active
                                    ? 'bg-brand-neon-cyan/10 text-brand-neon-cyan border border-brand-neon-cyan/20'
                                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            <item.icon size={18} className="shrink-0" />
                            {isOpen && <span className="text-sm font-medium">{item.label}</span>}
                            {active && isOpen && (
                                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-neon-cyan" />
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
