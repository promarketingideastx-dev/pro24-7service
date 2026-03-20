'use client';

import { Home, Calendar, User, PlusCircle, Store } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLocale } from 'next-intl';
import { useAuth } from '@/context/AuthContext';

export function BottomNav() {
    const pathname = usePathname();
    const locale = useLocale();
    const { user, userProfile } = useAuth();

    // Helper for locale prefixes
    const lp = (path: string) => `/${locale}${path}`;

    // Hide on wizard pages or specific flows if needed
    if (pathname?.includes('/business/setup')) return null;

    const getProfileRoute = () => {
        if (!user) return lp('/auth/login');
        if (userProfile?.isAdmin || userProfile?.roles?.admin === true) return lp('/admin');
        return lp('/user/profile');
    };

    const profileHref = getProfileRoute();

    // Helper function to check if user has provider privileges
    const isProvider = userProfile?.roles?.provider === true || userProfile?.role === 'provider' || userProfile?.isAdmin === true || userProfile?.roles?.admin === true || userProfile?.providerOnboardingStatus === 'completed';

    const navItems = [
        { name: 'Inicio', icon: Home, href: lp('/') },
        { 
            name: isProvider ? 'Negocio' : 'Ofrecer', 
            icon: Store, 
            href: isProvider ? lp('/business/dashboard') : lp('/pricing?intent=business'), 
            isFab: true 
        },
        { name: 'Agenda', icon: Calendar, href: profileHref },
        { name: 'Perfil', icon: User, href: profileHref },
    ];

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-brand-dark/90 backdrop-blur-xl border-t border-slate-200 pb-safe pt-2 px-6 safe-area-bottom">
            <div className="flex justify-between items-center h-16">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;

                    if (item.isFab) {
                        return (
                            <Link key={item.name} href={item.href}>
                                <div className="relative -top-5">
                                    <div className="w-14 h-14 rounded-full bg-gradient-to-r from-brand-neon-cyan to-brand-neon-purple p-[1px] shadow-[0_0_20px_rgba(0,240,255,0.4)]">
                                        <div className="w-full h-full rounded-full bg-brand-dark flex items-center justify-center">
                                            <PlusCircle className="w-8 h-8 text-white" />
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        );
                    }

                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={`flex flex-col items-center justify-center space-y-1 w-12 ${isActive ? 'text-brand-neon-cyan' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                            <item.icon className={`w-6 h-6 ${isActive ? 'drop-shadow-[0_0_8px_rgba(0,240,255,0.6)]' : ''}`} />
                            <span className="text-[10px] font-medium">{item.name}</span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
