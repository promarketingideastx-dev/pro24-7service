'use client';

import { useState, useEffect, useRef } from 'react';
import { Share2, ArrowLeft, Star, MapPin, Heart, Award, CheckCircle2, Phone, MessageCircle, Calendar, Link, Settings } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { FavoritesService } from '@/services/favorites.service';
import { useTranslations, useLocale } from 'next-intl';
import { TAXONOMY } from '@/lib/taxonomy';
import dynamic from 'next/dynamic';
import { Share } from '@capacitor/share';
import { AuthRequiredModal, AuthRequiredContext } from '@/components/public/AuthRequiredModal';

interface ProfileLayoutProps {
    business: any;
    activeTab: string;
    onTabChange: (tab: string) => void;
    children: React.ReactNode;
    isOwner?: boolean;
    onBookClick: () => void;
    isModalOpen?: boolean;
    showTeamTab?: boolean; // true when business plan is plus_team or vip
}

export default function BusinessProfileLayout({ business, activeTab, onTabChange, children, isOwner, onBookClick, isModalOpen, showTeamTab }: ProfileLayoutProps) {
    const router = useRouter();
    const { user } = useAuth();
    const t = useTranslations('business.publicProfile');
    const locale = useLocale();
    const [isFavorited, setIsFavorited] = useState(false);
    const [heartAnim, setHeartAnim] = useState(false);
    const [favProcessing, setFavProcessing] = useState(false);
    const [contentScrolled, setContentScrolled] = useState(false);
    const contentRef = useRef<HTMLDivElement>(null);

    // --- Modal State for Curious Mode 2.0 ---
    const [authModalOpen, setAuthModalOpen] = useState(false);
    const [authModalContext, setAuthModalContext] = useState<AuthRequiredContext>('default');

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

    function handleRestrictedAction(e?: React.MouseEvent, context: AuthRequiredContext = 'default') {
        if (e) e.preventDefault();
        setAuthModalContext(context);
        setAuthModalOpen(true);
    }

    const handleFavorite = async () => {
        if (!user) return handleRestrictedAction();
        if (!business?.id || favProcessing) return;
        setFavProcessing(true);

        // — Optimistic UI —
        const wasAlreadyFav = isFavorited;
        setIsFavorited(!wasAlreadyFav);
        setHeartAnim(true);
        setTimeout(() => setHeartAnim(false), 400);

        try {
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
                toast.success(t('favAdded'), { description: t('favAddedDesc') });
            } else {
                toast(t('favRemoved'), { icon: '💔' });
            }
        } catch (err) {
            // Revert optimistic update on error
            setIsFavorited(wasAlreadyFav);
            console.error('Error toggling favorite:', err);
            toast.error(t('favError') ?? 'Error al guardar favorito');
        }

        setFavProcessing(false);
    };

    const handleShare = async () => {
        // In Capacitor, window.location.origin might be 'capacitor://localhost' or 'http://localhost'
        // iOS share sheet will silently fail or crash if given a non-public scheme.
        const isNative = window.location.origin.includes('capacitor') || window.location.origin.includes('localhost');
        const origin = isNative ? 'https://pro24-7ya.com' : window.location.origin;
        const url = `${origin}${window.location.pathname}${window.location.search}`;

        const title = business?.name || t('defaultBusinessName');
        const text = t('shareText').replace('{title}', title);

        try {
            await Share.share({
                title,
                text,
                url,
                dialogTitle: 'Compartir Perfil'
            });
        } catch (error) {
            console.warn("Native share failed/cancelled, falling back to web:", error);
            // Fallbacks for web
            if (navigator.share) {
                try {
                    await navigator.share({ title, text, url });
                } catch { /* user cancelled */ }
            } else {
                try {
                    await navigator.clipboard.writeText(url);
                    toast.success(t('linkCopied'), { icon: '🔗' });
                } catch {
                    toast.error(t('linkCopyError'));
                }
            }
        }
    };

    // Detectar scroll interno del contenido para sombra en tabs
    useEffect(() => {
        const el = contentRef.current;
        if (!el) return;
        const handleScroll = () => setContentScrolled(el.scrollTop > 10);
        el.addEventListener('scroll', handleScroll, { passive: true });
        return () => el.removeEventListener('scroll', handleScroll);
    }, []);

    const tabs = [
        { id: 'services', label: t('tabServices') },
        { id: 'gallery', label: t('tabGallery') },
        { id: 'reviews', label: t('tabReviews') },
        { id: 'details', label: t('tabDetails') },
        ...(showTeamTab ? [{ id: 'team', label: `👥 ${t('tabTeam')}` }] : []),
    ];


    const handleBookClick = (e: React.MouseEvent) => {
        if (!user && !isOwner) return handleRestrictedAction(e, 'booking');
        onBookClick();
    };

    const handleWhatsApp = () => {
        if (!user && !isOwner) return handleRestrictedAction(undefined, 'contact');
        if (business.phone) {
            const phone = business.phone.replace(/\D/g, ''); // Remove non-digits
            window.open(`https://wa.me/${phone}`, '_blank');
        }
    };

    const handleCall = () => {
        if (!user && !isOwner) return handleRestrictedAction(undefined, 'contact');
        if (business.phone) {
            window.open(`tel:${business.phone}`, '_self');
        }
    };

    if (!business) return null;

    return (
        <main className="h-[100dvh] flex flex-col overflow-hidden bg-[#F4F6F8] text-slate-900 font-sans">

            {/* --- 1. PREMIUM HEADER --- */}
            <header className="relative w-full">

                {/* Foto de portada — extendida para evitar cortes visuales y dejar espacio a navegación */}
                <div className="h-56 md:h-72 lg:h-[340px] w-full bg-slate-800 relative overflow-hidden">
                    {business.coverImage ? (
                        <img src={business.coverImage} className="w-full h-full object-cover object-center" alt="Cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
                            <span className="text-6xl opacity-20">🏢</span>
                        </div>
                    )}
                    {/* Shadow gradient for general depth at the bottom */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F19] via-[#0B0F19]/20 to-transparent"></div>
                    {/* Shadow gradient at the top so white buttons are always visible */}
                    <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/60 to-transparent pointer-events-none"></div>
                </div>

                {/* Top Nav (Absolute) */}
                <div
                    className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-50 transition-all pointer-events-none"
                    style={{ paddingTop: 'calc(max(env(safe-area-inset-top), 20px) + 12px)' }}
                >
                    <button
                        onClick={() => router.back()}
                        className="p-2.5 rounded-full bg-black/30 backdrop-blur-md text-white border border-white/20 hover:bg-black/50 hover:scale-105 active:scale-95 transition-all shadow-[0_4px_12px_rgba(0,0,0,0.3)] pointer-events-auto"
                    >
                        <ArrowLeft className="w-5 h-5 drop-shadow-md" />
                    </button>
                    <div className="flex gap-3 pointer-events-auto">
                        {/* Desktop Booking CTA */}
                        {!isOwner && (
                            <>
                                <button
                                    onClick={handleBookClick}
                                    className="hidden md:flex bg-[#14B8A6] hover:bg-[#0F9488] text-white px-4 py-2 rounded-full text-sm font-bold backdrop-blur-md transition-all shadow-lg shadow-teal-500/30 items-center gap-2 border border-teal-400 hover:scale-105 active:scale-95"
                                >
                                    <Calendar className="w-4 h-4" />
                                    {t('bookAppointment')}
                                </button>
                            </>
                        )}

                        {/* Owner Actions */}
                        {isOwner && (
                            <button
                                onClick={() => router.push(`/${locale}/business/dashboard`)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/30 border border-white/20 text-white text-xs font-bold backdrop-blur-md shadow-[0_4px_12px_rgba(0,0,0,0.3)] hover:bg-[#14B8A6]/80 hover:border-[#14B8A6] transition-all"
                            >
                                <Settings className="w-3.5 h-3.5" />
                                <span className="drop-shadow-sm">Admin</span>
                            </button>
                        )}
                        <button
                            onClick={handleShare}
                            className="p-2.5 rounded-full bg-black/30 backdrop-blur-md text-white border border-white/20 hover:bg-black/50 hover:scale-105 active:scale-95 transition-all shadow-[0_4px_12px_rgba(0,0,0,0.3)]"
                            title={t('shareTitle')}
                        >
                            <Share2 className="w-5 h-5 drop-shadow-md" />
                        </button>
                        <button
                            onClick={handleFavorite}
                            disabled={favProcessing}
                            className={`p-2.5 rounded-full backdrop-blur-md shadow-[0_4px_12px_rgba(0,0,0,0.3)] border transition-all ${favProcessing ? 'opacity-60 cursor-wait' : 'hover:scale-105 active:scale-90'} ${isFavorited
                                ? 'bg-black/30 border-red-500 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]'
                                : 'bg-black/30 border-white/20 text-white hover:bg-black/50 hover:border-red-400/50 hover:text-red-400'
                                } ${heartAnim ? 'scale-125' : 'scale-100'}`}
                            title={isFavorited ? t('favRemoveTitle') : t('favAddTitle')}
                        >
                            <Heart className={`w-5 h-5 drop-shadow-md transition-all ${isFavorited ? 'fill-red-500' : ''}`} />
                        </button>
                    </div>
                </div>

                {/* Business Info (Overlapping Cover) */}
                <div className="px-6 -mt-14 md:-mt-20 relative flex flex-col md:flex-row gap-4 md:items-end">

                    {/* Avatar / Logo */}
                    <div className="w-28 h-28 md:w-36 md:h-36 rounded-[1.75rem] border-4 border-[#F4F6F8] ring-4 ring-white bg-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.15)] overflow-hidden shrink-0 relative z-10 group bg-clip-padding">
                        {/* Fallback logic for avatar if needed, using coverImage as proxy or first gallery image */}
                        {business.logoUrl || business.coverImage ? (
                            <img src={business.logoUrl || business.coverImage} className="w-full h-full object-cover" alt="Logo" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-slate-100 text-3xl">
                                {business.name?.charAt(0) || 'B'}
                            </div>
                        )}
                        {/* Verified Badge Overlay */}
                        {business.verified && (
                            <div className="absolute bottom-1 right-1 bg-green-500 text-white rounded-full p-0.5 border-2 border-white">
                                <CheckCircle2 className="w-4 h-4" />
                            </div>
                        )}
                    </div>

                    {/* Text Info */}
                    <div className="flex-1 pb-2">
                        <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-3">
                            <div>
                                <h1 className="text-2xl md:text-4xl font-bold text-slate-900 mb-1 leading-tight">{business.name}</h1>

                                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-400">
                                    <span className="flex items-center text-[#0F766E] font-medium bg-[rgba(20,184,166,0.1)] px-2 py-0.5 rounded">
                                        <Award className="w-4 h-4 mr-1" />
                                        {business.reviewCount > 0
                                            ? (business.rating ? business.rating.toFixed(1) : '—')
                                            : <span className="text-xs">Nuevo</span>
                                        }
                                    </span>
                                    <span>•</span>
                                    <span className="flex items-center">
                                        <MapPin className="w-4 h-4 mr-1 text-slate-500" />
                                        {business.city}, {business.country || 'HN'}
                                    </span>
                                    <span>•</span>
                                    <span className="text-slate-500">
                                        {(() => {
                                            const localeKey = locale === 'en' ? 'en' : locale === 'pt-BR' ? 'pt' : 'es';
                                            const cat = TAXONOMY[business.category as keyof typeof TAXONOMY];
                                            return cat ? cat.label[localeKey as keyof typeof cat.label] : business.category;
                                        })()}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* --- 2. TABS ANCLADAS --- */}
            <div className={`shrink-0 bg-[#F4F6F8]/90 backdrop-blur-xl border-b border-slate-200 mt-4 transition-all duration-300 ${contentScrolled ? 'shadow-md' : ''}`}>
                <div className="flex overflow-x-auto no-scrollbar justify-start md:justify-center px-4">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={(e) => {
                                if (tab.id === 'details' && !user) {
                                    handleRestrictedAction(e);
                                    return;
                                }
                                onTabChange(tab.id);
                            }}
                            className={`px-6 py-4 font-medium text-sm whitespace-nowrap border-b-2 transition-all ${activeTab === tab.id
                                ? 'border-[#14B8A6] text-[#0F766E]'
                                : 'border-transparent text-slate-400 hover:text-slate-800'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* --- 3. ÁREA DE CONTENIDO (único elemento con scroll) --- */}
            <div ref={contentRef} className="flex-1 overflow-y-auto pb-24">
                {children}
            </div>

            {/* --- 4. MOBILE STICKY ACTION BAR (hidden when modal is open) --- */}
            {!isOwner && !isModalOpen && (
                <div className="fixed bottom-0 left-0 right-0 bg-[#F4F6F8]/90 backdrop-blur-lg border-t border-slate-200 p-4 md:hidden z-50 flex gap-3 animate-in slide-in-from-bottom-full duration-500">
                    {/* WhatsApp Button */}
                    <button
                        onClick={handleWhatsApp}
                        className="w-12 h-12 flex items-center justify-center rounded-xl bg-green-500/10 text-green-500 border border-green-500/20 hover:bg-green-500/20 active:scale-95 transition-all"
                    >
                        <MessageCircle className="w-6 h-6" />
                    </button>

                    {/* Call Button */}
                    <button
                        onClick={handleCall}
                        className="w-12 h-12 flex items-center justify-center rounded-xl bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200 active:scale-95 transition-all"
                    >
                        <Phone className="w-5 h-5" />
                    </button>

                    {/* Book Action - Main */}
                    <button
                        onClick={handleBookClick}
                        className="flex-1 bg-[#14B8A6] hover:bg-[#0F9488] text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-teal-500/20 active:scale-95 transition-all"
                    >
                        <Calendar className="w-5 h-5" />
                        {t('bookAppointment')}
                    </button>
                </div>
            )}

            <AuthRequiredModal
                isOpen={authModalOpen}
                context={authModalContext}
                onClose={() => setAuthModalOpen(false)}
            />
            {/* Chat Modal removed */}
        </main>
    );
}
