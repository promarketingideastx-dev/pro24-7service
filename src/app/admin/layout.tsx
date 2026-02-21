'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
    const [sidebarOpen, setSidebarOpen] = useState(true);

    useEffect(() => {
        if (loading) return;
        if (!user) { router.replace('/auth/login'); return; }

        // Check admin role in Firestore
        getDoc(doc(db, 'users', user.uid)).then(snap => {
            const data = snap.data();
            if (data?.isAdmin === true) {
                setIsAdmin(true);
            } else {
                setIsAdmin(false);
                router.replace('/');
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
        <div className="min-h-screen bg-[#060d1f] flex">
            <AdminSidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(p => !p)} />
            <div className={`flex-1 flex flex-col transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-16'}`}>
                <AdminHeader onMenuToggle={() => setSidebarOpen(p => !p)} />
                <main className="flex-1 p-6 overflow-auto">
                    {children}
                </main>
            </div>
        </div>
    );
}
