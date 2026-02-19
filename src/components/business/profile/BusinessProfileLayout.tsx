'use client';

import { useState, useEffect } from 'react';
import { Share2, ArrowLeft, Star, MapPin, Heart, Award, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

interface ProfileLayoutProps {
    business: any; // Using 'any' to fit existing data shape easily
    activeTab: string;
    onTabChange: (tab: string) => void;
    children: React.ReactNode;
    isOwner?: boolean;
}

export default function BusinessProfileLayout({ business, activeTab, onTabChange, children, isOwner }: ProfileLayoutProps) {
    const router = useRouter();
    const { user } = useAuth();
    const [isSticky, setIsSticky] = useState(false);

    // Handle Scroll for Sticky Tabs visual effect (optional)
    useEffect(() => {
        const handleScroll = () => {
            const offset = window.scrollY;
            setIsSticky(offset > 250); // Approx height of header
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const tabs = [
        { id: 'services', label: 'Servicios' },
        { id: 'gallery', label: 'Galería' },
        { id: 'reviews', label: 'Reseñas' },
        { id: 'details', label: 'Detalles' }
    ];

    if (!business) return null;

    return (
        <main className="min-h-screen bg-[#0B0F19] text-white font-sans pb-20">

            {/* --- 1. PREMIUM HEADER --- */}
            <header className="relative w-full">

                {/* Cover Image */}
                <div className="h-48 md:h-64 lg:h-72 w-full bg-slate-800 relative overflow-hidden">
                    {business.coverImage ? (
                        <img src={business.coverImage} className="w-full h-full object-cover" alt="Cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
                            <span className="text-6xl opacity-20">🏢</span>
                        </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F19] via-[#0B0F19]/60 to-transparent"></div>
                </div>

                {/* Top Nav (Absolute) */}
                <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-50">
                    <button
                        onClick={() => router.back()}
                        className="p-2 rounded-full bg-black/40 backdrop-blur-md text-white border border-white/10 hover:bg-black/60 transition-all"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="flex gap-3">
                        {/* Owner Actions */}
                        {isOwner && (
                            <button
                                onClick={() => router.push('/business/dashboard')}
                                className="px-3 py-1.5 rounded-full bg-brand-neon-cyan/20 border border-brand-neon-cyan/50 text-brand-neon-cyan text-xs font-bold backdrop-blur-md hover:bg-brand-neon-cyan/30"
                            >
                                Editar Perfil
                            </button>
                        )}
                        <button className="p-2 rounded-full bg-black/40 backdrop-blur-md text-white border border-white/10 hover:bg-black/60 transition-all">
                            <Share2 className="w-5 h-5" />
                        </button>
                        <button className="p-2 rounded-full bg-black/40 backdrop-blur-md text-white border border-white/10 hover:bg-black/60 transition-all">
                            <Heart className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Business Info (Overlapping Cover) */}
                <div className="px-6 -mt-12 relative flex flex-col md:flex-row gap-4 md:items-end">

                    {/* Avatar / Logo */}
                    <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl md:rounded-3xl bg-slate-800 border-4 border-[#0B0F19] shadow-2xl overflow-hidden shrink-0 relative z-10 group">
                        {/* Fallback logic for avatar if needed, using coverImage as proxy or first gallery image */}
                        {business.logoUrl || business.coverImage ? (
                            <img src={business.logoUrl || business.coverImage} className="w-full h-full object-cover" alt="Logo" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-slate-700 text-3xl">
                                {business.name?.charAt(0) || 'B'}
                            </div>
                        )}
                        {/* Verified Badge Overlay */}
                        {business.verified && (
                            <div className="absolute bottom-1 right-1 bg-green-500 text-white rounded-full p-0.5 border-2 border-[#0B0F19]">
                                <CheckCircle2 className="w-3 h-3" />
                            </div>
                        )}
                    </div>

                    {/* Text Info */}
                    <div className="flex-1 pt-2 md:pt-0 md:pb-2">
                        <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight shadow-black drop-shadow-lg">
                            {business.name}
                        </h1>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2 text-sm">
                            <span className="text-brand-neon-cyan font-semibold flex items-center gap-1">
                                {business.category}
                                <span className="text-slate-500">•</span>
                                {business.subcategory}
                            </span>

                            <div className="flex items-center gap-1 text-slate-300">
                                <MapPin className="w-3.5 h-3.5" />
                                {business.city || 'Ubicación'}
                            </div>

                            <div className="flex items-center gap-1 bg-white/10 px-2 py-0.5 rounded-md border border-white/5">
                                <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                                <span className="font-bold text-white">{business.rating || '5.0'}</span>
                                <span className="text-slate-400 text-xs">({business.reviewCount || 0})</span>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* --- 2. STICKY TABS --- */}
            <nav className="sticky top-0 z-40 bg-[#0B0F19]/95 backdrop-blur-md border-b border-white/10 mt-6 md:mt-8">
                <div className="flex items-center px-4 overflow-x-auto no-scrollbar">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => onTabChange(tab.id)}
                            className={`
                                relative px-4 py-4 text-sm font-bold transition-colors whitespace-nowrap min-w-[max-content]
                                ${activeTab === tab.id ? 'text-brand-neon-cyan' : 'text-slate-400 hover:text-white'}
                            `}
                        >
                            {tab.label}
                            {activeTab === tab.id && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-neon-cyan shadow-[0_0_10px_rgba(0,240,255,0.5)] rounded-t-full"></div>
                            )}
                        </button>
                    ))}
                </div>
            </nav>

            {/* --- 3. CONTENT AREA --- */}
            <div className="min-h-[50vh] bg-[#0B0F19]">
                {children}
            </div>

            {/* --- 4. FLOATING CTA (Mobile) or SIDE ACTION (Desktop) --- */}
            {/* Note: Specific tabs might have their own actions, but a global "Book" is good */}
        </main>
    );
}
