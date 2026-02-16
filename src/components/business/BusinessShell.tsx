'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Store, Calendar, Settings, logOut, Menu, X, PlusCircle } from 'lucide-react';
import GlassPanel from '@/components/ui/GlassPanel';
import BusinessGuard from '@/components/auth/BusinessGuard';
import { AuthService } from '@/services/auth.service';

export default function BusinessShell({ children }: { children: React.ReactNode }) {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const pathname = usePathname();

    const menuItems = [
        { name: 'Dashboard', href: '/business/dashboard', icon: <LayoutDashboard size={20} /> },
        { name: 'Mis Servicios', href: '/business/services', icon: <Store size={20} /> },
        { name: 'Agenda', href: '/business/schedule', icon: <Calendar size={20} /> },
        { name: 'Configuración', href: '/business/setup', icon: <Settings size={20} /> }, // Temporary strict link
    ];

    const isActive = (path: string) => pathname === path;

    return (
        <BusinessGuard>
            <div className="min-h-screen bg-[#0B0F19] text-white flex flex-col md:flex-row relative overflow-hidden">

                {/* Background Ambient Effects (Consistent with Auth) */}
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-500/05 rounded-full blur-[100px] pointer-events-none"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-500/05 rounded-full blur-[100px] pointer-events-none"></div>

                {/* Mobile Header */}
                <div className="md:hidden flex items-center justify-between p-4 bg-[#151b2e]/90 backdrop-blur-md border-b border-white/10 z-50 sticky top-0">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-400 to-blue-500 flex items-center justify-center">
                            <span className="font-bold text-xs text-black">P24</span>
                        </div>
                        <span className="font-bold text-sm">Provider Panel</span>
                    </div>
                    <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-slate-300">
                        {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>

                {/* Sidebar (Desktop + Mobile Drawer) */}
                <aside className={`
                    fixed inset-y-0 left-0 z-40 w-64 bg-[#151b2e]/95 backdrop-blur-xl border-r border-white/10 transform transition-transform duration-300 ease-in-out
                    md:relative md:translate-x-0
                    ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
                `}>
                    <div className="flex flex-col h-full p-6">
                        {/* Logo (Desktop) */}
                        <div className="hidden md:flex items-center gap-3 mb-10">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-400 to-blue-500 flex items-center justify-center shadow-[0_0_15px_rgba(0,240,255,0.3)]">
                                <span className="font-extrabold text-sm text-black">P24</span>
                            </div>
                            <div>
                                <h1 className="font-bold text-lg leading-none">PRO24/7</h1>
                                <span className="text-[10px] text-cyan-400 font-medium tracking-wider uppercase">Business</span>
                            </div>
                        </div>

                        {/* Navigation */}
                        <nav className="flex-1 space-y-2">
                            {menuItems.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className={`
                                        flex items-center gap-3 px-4 py-3 rounded-xl transition-all group
                                        ${isActive(item.href)
                                            ? 'bg-gradient-to-r from-cyan-600/20 to-blue-600/20 text-white border border-cyan-500/30'
                                            : 'text-slate-400 hover:bg-white/5 hover:text-white'
                                        }
                                    `}
                                >
                                    <span className={isActive(item.href) ? 'text-cyan-400' : 'text-slate-500 group-hover:text-white'}>
                                        {item.icon}
                                    </span>
                                    <span className="font-medium text-sm">{item.name}</span>
                                </Link>
                            ))}
                        </nav>

                        {/* Logout */}
                        <button
                            onClick={async () => await AuthService.logout()}
                            className="mt-auto flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                        >
                            <span className="rotate-180"><logOut size={20} /></span>
                            <span className="font-medium text-sm">Cerrar Sesión</span>
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
        </BusinessGuard>
    );
}
