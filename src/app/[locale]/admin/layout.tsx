'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { useAuth } from '@/context/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import { AdminContextProvider } from '@/context/AdminContext';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    const router = useRouter();
    const locale = useLocale();
    const lp = (path: string) => `/${locale}${path}`;
    const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
    const [sidebarOpen, setSidebarOpen] = useState(true);

    useEffect(() => {
        if (loading) return;
        if (!user) { router.replace(lp('/auth/login')); return; }

        getDoc(doc(db, 'users', user.uid)).then(snap => {
            const data = snap.data();
            if (data?.isAdmin === true) {
                setIsAdmin(true);
            } else {
                setIsAdmin(false);
                router.replace(lp('/'));
            }
        });
    }, [user, loading, router]);

    if (loading || isAdmin === null) {
        return (
            <div className="min-h-screen bg-[#060d1f] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-2 border-brand-neon-cyan/30 border-t-brand-neon-cyan rounded-full animate-spin" />
                    <p className="text-slate-400 text-sm">Verificando acceso...</p>
                </div>
            </div>
        );
    }

    if (isAdmin === false) return null;

    return (
        <AdminContextProvider>
            {/* !pb-0 neutraliza el pb-20 global del body; isolate-admin evita gradient negro */}
            <div id="admin-root" className="h-screen bg-[#060d1f] flex overflow-hidden !pb-0" style={{ background: '#060d1f' }}>
                <AdminSidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(p => !p)} />
                <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#060d1f]">
                    <AdminHeader onMenuToggle={() => setSidebarOpen(p => !p)} />
                    <main className="flex-1 p-6 overflow-y-auto bg-[#060d1f]">
                        {children}
                    </main>
                </div>
            </div>
        </AdminContextProvider>
    );
}
