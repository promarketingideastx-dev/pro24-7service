'use client';

import { useState, useEffect } from 'react';
import { Share2, ArrowLeft, Star, MapPin, Heart, Award, CheckCircle2, Phone, MessageCircle, Calendar, Link } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { FavoritesService } from '@/services/favorites.service';

interface ProfileLayoutProps {
    business: any;
    activeTab: string;
    onTabChange: (tab: string) => void;
    children: React.ReactNode;
    isOwner?: boolean;
    onBookClick: () => void;
    isModalOpen?: boolean; // Hide sticky bar when booking modal is open
}

export default function BusinessProfileLayout({ business, activeTab, onTabChange, children, isOwner, onBookClick, isModalOpen }: ProfileLayoutProps) {
    const router = useRouter();
    const { user } = useAuth();
    const [isSticky, setIsSticky] = useState(false);
    const [isFavorited, setIsFavorited] = useState(false);
    const [heartAnim, setHeartAnim] = useState(false);
    const [favProcessing, setFavProcessing] = useState(false); // prevents double-tap

    // ─── Favorites: load from Firestore (if logged in) or localStorage ────
    const favKey = 'pro247_favorites';

    useEffect(() => {
        const loadFav = async () => {
            if (user && business?.id) {
                try {
                    const favd = await FavoritesService.isFavorited(user.uid, business.id);
                    setIsFavorited(favd);
                    return;
                } catch { /* fallback to localStorage */ }
            }
            // localStorage fallback (guest)
            try {
                const stored = JSON.parse(localStorage.getItem(favKey) || '[]') as string[];
                setIsFavorited(stored.includes(business?.id));
            } catch { /* ignore */ }
        };
        loadFav();
    }, [user, business?.id]);

    const handleFavorite = async () => {
        if (!business?.id || favProcessing) return; // guard against double-tap
        setFavProcessing(true);

        if (user) {
            // — Optimistic UI: flip immediately so first tap feels instant —
            const wasAlreadyFav = isFavorited;
            setIsFavorited(!wasAlreadyFav);
            setHeartAnim(true);
            setTimeout(() => setHeartAnim(false), 400);

            const added = await FavoritesService.toggle(
                user.uid,
                { name: user.displayName || undefined, email: user.email || undefined },
                {
                    id: business.id,
                    name: business.name,
                    category: business.category,
                    city: business.city,
                    logoUrl: business.logoUrl,
                }
            );
            // Sync with real server response
            setIsFavorited(added);
            if (added) {
                toast.success('Negocio guardado en tus favoritos ❤️', { description: 'Lo puedes ver en tu perfil' });
            } else {
                toast('Eliminado de favoritos', { icon: '💔' });
            }
        } else {
            // — Guest: localStorage only + prompt to login —
            try {
                const stored = JSON.parse(localStorage.getItem(favKey) || '[]') as string[];
                let updated: string[];
                if (isFavorited) {
                    updated = stored.filter((id) => id !== business.id);
                    toast('Eliminado de favoritos', { icon: '💔' });
                } else {
                    updated = Array.from(new Set([...stored, business.id]));
                    toast.success('¡Guardado! Inicia sesión para sincronizar tus favoritos', { icon: '❤️' });
                }
                localStorage.setItem(favKey, JSON.stringify(updated));
                setIsFavorited(!isFavorited);
                setHeartAnim(true);
                setTimeout(() => setHeartAnim(false), 400);
            } catch { /* ignore */ }
        }

        setFavProcessing(false);
    };

    const handleShare = async () => {
        const url = window.location.href;
        const title = business?.name || 'Negocio en PRO24/7';
        const text = `¡Mira este negocio en PRO24/7: ${title}`;

        if (navigator.share) {
            try {
                await navigator.share({ title, text, url });
            } catch { /* user cancelled */ }
        } else {
            try {
                await navigator.clipboard.writeText(url);
                toast.success('¡Enlace copiado!', { icon: '🔗' });
            } catch {
                toast.error('No se pudo copiar el enlace');
            }
        }
    };

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

    const handleWhatsApp = () => {
        if (business.phone) {
            const phone = business.phone.replace(/\D/g, ''); // Remove non-digits
            window.open(`https://wa.me/${phone}`, '_blank');
        }
    };

    const handleCall = () => {
        if (business.phone) {
            window.open(`tel:${business.phone}`, '_self');
        }
    };

    if (!business) return null;

    return (
        <main className="min-h-screen bg-[#154040] text-white font-sans pb-24 md:pb-20">

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
                    <div className="absolute inset-0 bg-gradient-to-t from-[#154040] via-[#154040]/60 to-transparent"></div>
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
                        {/* Desktop Booking CTA */}
                        {!isOwner && (
                            <button
                                onClick={onBookClick}
                                className="hidden md:flex bg-brand-neon-cyan/90 hover:bg-cyan-400 text-black px-4 py-2 rounded-full text-sm font-bold backdrop-blur-md transition-all shadow-lg shadow-cyan-500/20 items-center gap-2"
                            >
                                <Calendar className="w-4 h-4" />
                                Reservar Cita
                            </button>
                        )}

                        {/* Owner Actions */}
                        {isOwner && (
                            <button
                                onClick={() => router.push('/business/dashboard')}
                                className="px-3 py-1.5 rounded-full bg-brand-neon-cyan/20 border border-brand-neon-cyan/50 text-brand-neon-cyan text-xs font-bold backdrop-blur-md hover:bg-brand-neon-cyan/30"
                            >
                                Editar Perfil
                            </button>
                        )}
                        <button
                            onClick={handleShare}
                            className="p-2 rounded-full bg-black/40 backdrop-blur-md text-white border border-white/10 hover:bg-brand-neon-cyan/20 hover:border-brand-neon-cyan/40 hover:text-brand-neon-cyan active:scale-90 transition-all"
                            title="Compartir"
                        >
                            <Share2 className="w-5 h-5" />
                        </button>
                        <button
                            onClick={handleFavorite}
                            disabled={favProcessing}
                            className={`p-2 rounded-full backdrop-blur-md border transition-all ${favProcessing ? 'opacity-60 cursor-wait' : 'active:scale-90'} ${isFavorited
                                ? 'bg-red-500/20 border-red-500/40 text-red-400 shadow-[0_0_12px_rgba(239,68,68,0.4)]'
                                : 'bg-black/40 border-white/10 text-white hover:bg-red-500/10 hover:border-red-400/30 hover:text-red-400'
                                } ${heartAnim ? 'scale-125' : 'scale-100'}`}
                            title={isFavorited ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                        >
                            <Heart className={`w-5 h-5 transition-all ${isFavorited ? 'fill-red-400' : ''}`} />
                        </button>
                    </div>
                </div>

                {/* Business Info (Overlapping Cover) */}
                <div className="px-6 -mt-12 relative flex flex-col md:flex-row gap-4 md:items-end">

                    {/* Avatar / Logo */}
                    <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl md:rounded-3xl bg-slate-800 border-4 border-[#154040] shadow-2xl overflow-hidden shrink-0 relative z-10 group">
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
                            <div className="absolute bottom-1 right-1 bg-green-500 text-white rounded-full p-0.5 border-2 border-[#154040]">
                                <CheckCircle2 className="w-4 h-4" />
                            </div>
                        )}
                    </div>

                    {/* Text Info */}
                    <div className="flex-1 pb-2">
                        <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-3">
                            <div>
                                <h1 className="text-2xl md:text-4xl font-bold text-white mb-1 leading-tight">{business.name}</h1>

                                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-400">
                                    <span className="flex items-center text-brand-neon-cyan font-medium bg-brand-neon-cyan/10 px-2 py-0.5 rounded">
                                        <Award className="w-4 h-4 mr-1" />
                                        {business.rating || '5.0'}
                                    </span>
                                    <span>•</span>
                                    <span className="flex items-center">
                                        <MapPin className="w-4 h-4 mr-1 text-slate-500" />
                                        {business.city}, {business.country || 'HN'}
                                    </span>
                                    <span>•</span>
                                    <span className="text-slate-500">{business.category}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* --- 2. STICKY TABS --- */}
            <div className={`sticky top-0 z-40 bg-[#154040]/80 backdrop-blur-xl border-b border-white/5 mt-6 transition-all duration-300 ${isSticky ? 'shadow-lg shadow-black/50' : ''}`}>
                <div className="flex overflow-x-auto no-scrollbar justify-start md:justify-center px-4">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => onTabChange(tab.id)}
                            className={`px-6 py-4 font-medium text-sm whitespace-nowrap border-b-2 transition-all ${activeTab === tab.id
                                ? 'border-brand-neon-cyan text-brand-neon-cyan'
                                : 'border-transparent text-slate-400 hover:text-white'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* --- 3. CONTENT AREA --- */}
            <div className="min-h-[50vh] bg-[#154040]">
                {children}
            </div>

            {/* --- 4. MOBILE STICKY ACTION BAR (hidden when modal is open) --- */}
            {!isOwner && !isModalOpen && (
                <div className="fixed bottom-0 left-0 right-0 bg-[#154040]/90 backdrop-blur-lg border-t border-white/10 p-4 md:hidden z-50 flex gap-3 animate-in slide-in-from-bottom-full duration-500">
                    {/* WhatsApp Button */}
                    <button
                        onClick={handleWhatsApp}
                        className="w-12 h-12 flex items-center justify-center rounded-xl bg-green-500/10 text-green-500 border border-green-500/20 hover:bg-green-500/20 active:scale-95 transition-all"
                    >
                        <MessageCircle className="w-6 h-6" />
                    </button>

                    {/* Call Button (Optional, can be hidden if no phone) */}
                    <button
                        onClick={handleCall}
                        className="w-12 h-12 flex items-center justify-center rounded-xl bg-slate-800 text-slate-300 border border-white/10 hover:bg-slate-700 active:scale-95 transition-all"
                    >
                        <Phone className="w-5 h-5" />
                    </button>

                    {/* Book Action - Main */}
                    <button
                        onClick={onBookClick}
                        className="flex-1 bg-brand-neon-cyan hover:bg-cyan-400 text-black px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 active:scale-95 transition-all"
                    >
                        <Calendar className="w-5 h-5" />
                        Reservar Cita
                    </button>
                </div>
            )}
        </main>
    );
}
