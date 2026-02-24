'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Search, MapPin, Star, Bell, Filter, Grid, Zap, User, X, ChevronRight, Store, Share2 } from 'lucide-react';
import { DEMO_BUSINESSES, BusinessMock } from '@/data/mockBusinesses';
import { TAXONOMY } from '@/lib/taxonomy';
import { matchesSearch, findSuggestion } from '@/lib/searchUtils';
import { useCountry } from '@/context/CountryContext';
import CountrySelector from '@/components/ui/CountrySelector';
import dynamic from 'next/dynamic';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
// import AuthGateModal from '@/components/ui/AuthGateModal'; // Kept for reference but unused
import PublicBusinessPreviewModal from '@/components/ui/PublicBusinessPreviewModal';
import LanguageSwitcher from '@/components/ui/LanguageSwitcher';
import ShareAppModal from '@/components/ui/ShareAppModal';

const MapLoader = () => {
    const t = useTranslations('home');
    return <div className="h-full w-full bg-slate-900 animate-pulse rounded-3xl flex items-center justify-center text-slate-500">{t('loadingMap')}</div>;
};

const DynamicMap = dynamic(() => import('@/components/ui/MapWidget'), {
    ssr: false,
    loading: () => <MapLoader />,
});

export default function Home() {
    const [showShare, setShowShare] = useState(false);


    /* State for simple filtering */
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'new' | 'withSchedule'>('all');
    /* State for Category Modal */
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    /* State for Selected Business (Map Focus) */
    const [selectedBusiness, setSelectedBusiness] = useState<BusinessMock | null>(null);

    /* Country Context */
    const { selectedCountry, isLoading: isCountryLoading, clearCountry } = useCountry();

    /* Data State */
    /* Data State */
    const [businesses, setBusinesses] = useState<BusinessMock[]>(
        process.env.NEXT_PUBLIC_USE_MOCKS === 'true' ? DEMO_BUSINESSES : []
    );

    /* Auth Guard State */
    const { user, userProfile } = useAuth();
    const router = useRouter();
    const locale = useLocale();
    const localeKey = locale === 'en' ? 'en' : locale === 'pt-BR' ? 'pt' : 'es';
    const t = useTranslations('home');
    // Helper: prefixes any path with the current locale
    const lp = (path: string) => `/${locale}${path}`;
    // Categories (after t() is declared)
    const categories = [
        { id: 'general_services', name: t('cat_generalServices'), icon: '🛠️', color: 'text-blue-400', border: 'border-blue-500/30', bg: 'bg-blue-500/10' },
        { id: 'beauty_wellness', name: t('cat_beautyWellness'), icon: '💇\u200d♀️', color: 'text-pink-400', border: 'border-pink-500/30', bg: 'bg-pink-500/10' },
        { id: 'art_design', name: t('cat_artDesign'), icon: '🎨', color: 'text-purple-400', border: 'border-purple-500/30', bg: 'bg-purple-500/10' },
    ];
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [pendingBusiness, setPendingBusiness] = useState<BusinessMock | null>(null);

    // Effect: Load real businesses from Firestore
    useEffect(() => {
        const loadData = async () => {
            try {
                // Dynamically import service to avoid server-side issues if any
                const { BusinessProfileService } = await import('@/services/businessProfile.service');
                const realBiz = await BusinessProfileService.getPublicBusinesses();

                let combined = realBiz || [];

                // Strict Mock Logic: Only add demos if flag is explicitly true
                if (process.env.NEXT_PUBLIC_USE_MOCKS === 'true') {
                    const { DEMO_BUSINESSES } = await import('@/data/mockBusinesses');
                    combined = [...DEMO_BUSINESSES, ...combined];
                }

                if (combined.length > 0) {
                    // Simple dedup based on ID
                    const unique = Array.from(new Map(combined.map(item => [item.id, item])).values());
                    setBusinesses(unique as BusinessMock[]);
                } else {
                    setBusinesses([]);
                }
            } catch (error) {
                console.error("Failed to load real businesses:", error);
            }
        };
        loadData();
    }, []);

    const handleNavigate = (biz: BusinessMock) => {
        if (!user) {
            setPendingBusiness(biz);
            setShowAuthModal(true);
        } else {
            router.push(lp(`/negocio/${biz.id}`));
        }
    };

    // Timestamp-based double-tap: requires 2 intentional taps within 400ms
    // Fixes mobile phantom-click issue where 1 touch fires 2 click events ~10ms apart
    const lastTapRef = useRef<{ id: string; time: number } | null>(null);
    const DOUBLE_TAP_MS = 400;

    const handleBusinessClick = (biz: BusinessMock) => {
        const now = Date.now();
        const last = lastTapRef.current;

        if (last && last.id === biz.id && now - last.time < DOUBLE_TAP_MS) {
            // Genuine double-tap — navigate to profile
            lastTapRef.current = null;
            handleNavigate(biz);
        } else {
            // First tap — select & show card
            lastTapRef.current = { id: biz.id, time: now };
            setSelectedBusiness(biz);
        }
    };

    // Derived State: Intelligent Search Logic
    const [suggestion, setSuggestion] = useState<string | null>(null);

    const filteredBusinesses = businesses.filter(b => {
        // 0. Filter by Country Code (Strict)
        if (selectedCountry) {
            // countryCode is normalized by getPublicBusinesses (country → countryCode)
            const bizCountry = b.countryCode || 'HN';
            if (bizCountry !== selectedCountry.code) return false;
        }

        const term = searchTerm.trim();
        if (!term) return true;

        // 1. Prepare Searchable Text (Name, Category, Subcategory, Tags, Desc)
        const searchableText = `
            ${b.name} 
            ${b.category} 
            ${b.subcategory} 
            ${(b.tags || []).join(' ')} 
            ${b.description || ''}
        `;

        // 2. Use Advanced Token Matching
        return matchesSearch(searchableText, term);
    }).filter(b => {
        if (statusFilter === 'new') {
            // Show businesses created in last 30 days
            const created = (b as any).createdAt?.toDate?.() || (b as any).createdAt;
            if (!created) return false;
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            return new Date(created) >= thirtyDaysAgo;
        }
        if (statusFilter === 'withSchedule') {
            return !!(b as any).openingHours || !!(b as any).hasSchedule;
        }
        return true;
    });

    // Effect: Suggestions mechanism (Run when results are empty)
    useEffect(() => {
        const term = searchTerm.trim();
        if (term.length > 2 && filteredBusinesses.length === 0) {
            const match = findSuggestion(term);
            setSuggestion(match);
        } else {
            setSuggestion(null);
        }
    }, [searchTerm, filteredBusinesses.length]);

    const handleCategoryClick = (id: string) => {
        setSelectedCategory(id);
    };

    const selectedTaxonomy = selectedCategory ? TAXONOMY[selectedCategory as keyof typeof TAXONOMY] : null;

    // Show Loader or Country Selector
    if (isCountryLoading) return <div className="h-screen bg-[#F4F6F8] flex items-center justify-center text-slate-700">Cargando...</div>;
    if (!selectedCountry) return <CountrySelector />;

    return (
        <>
            <main className="h-screen bg-[#F4F6F8] text-slate-900 overflow-hidden font-sans flex flex-col">
                {/* ── Header ── */}
                <header className="shrink-0 px-4 py-3 flex items-center justify-between z-50 bg-[#F4F6F8] border-b border-slate-200">

                    {/* Left: country picker pill */}
                    <button
                        onClick={clearCountry}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 transition-all group"
                    >
                        <div className="w-5 h-3.5 rounded-sm overflow-hidden shadow-sm ring-1 ring-white/10">
                            <img
                                src={`https://flagcdn.com/w40/${selectedCountry.code.toLowerCase()}.png`}
                                alt={selectedCountry.name}
                                className="w-full h-full object-cover"
                            />
                        </div>
                        <span className="font-semibold text-sm text-slate-700 group-hover:text-brand-neon-cyan transition-colors">
                            {selectedCountry.name}
                        </span>
                        <MapPin className="w-3 h-3 text-slate-500 group-hover:text-brand-neon-cyan transition-colors" />
                    </button>

                    {/* Right: share + user/login */}
                    <div className="flex items-center gap-2">
                        {/* Share button — icon only on mobile */}
                        <button
                            onClick={() => setShowShare(true)}
                            title={t('share')}
                            className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-50 hover:bg-brand-neon-cyan/10 border border-slate-200 hover:border-brand-neon-cyan/30 text-slate-400 hover:text-brand-neon-cyan transition-all"
                        >
                            <Share2 size={15} />
                        </button>
                        {user ? (
                            <div className="flex items-center gap-3 group relative">
                                {/* Business Owner Switch */}
                                {userProfile?.roles?.provider && (
                                    <button
                                        onClick={() => router.push(lp('/business/dashboard'))}
                                        className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border border-brand-neon-cyan/30 bg-brand-neon-cyan/10 text-brand-neon-cyan text-xs font-bold hover:bg-brand-neon-cyan/20 transition-all"
                                    >
                                        <Store className="w-3 h-3" />
                                        {t('manageMyBusiness')}
                                    </button>
                                )}

                                {/* User Info (Desktop/Tablet) */}
                                <div className="hidden sm:flex flex-col items-end">
                                    <span className="text-xs font-bold text-slate-900 leading-none">{user.displayName || 'Usuario'}</span>
                                    <span className="text-[10px] text-slate-400">{t('viewProfile')}</span>
                                </div>

                                {/* Avatar / Menu Trigger */}
                                <button
                                    className="w-10 h-10 rounded-full bg-slate-800 border-2 border-brand-neon-cyan/50 p-0.5 overflow-hidden transition-transform hover:scale-105"
                                >
                                    {user.photoURL ? (
                                        <img src={user.photoURL} alt="User" className="w-full h-full rounded-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full bg-brand-neon-cyan text-black flex items-center justify-center font-bold">
                                            {user.email?.[0].toUpperCase() || 'U'}
                                        </div>
                                    )}
                                </button>

                                {/* Simple Dropdown for Logout */}
                                <div className="absolute top-12 right-0 w-48 bg-white border border-slate-200 rounded-xl shadow-2xl p-2 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all z-50">
                                    <div className="px-3 py-2 border-b border-slate-200 mb-1">
                                        <p className="text-xs text-slate-400">{t('loggedInAs')}</p>
                                        <p className="text-sm text-slate-800 font-medium truncate">{user.email}</p>
                                    </div>

                                    {userProfile?.roles?.provider && (
                                        <button
                                            onClick={() => router.push(lp('/business/dashboard'))}
                                            className="w-full text-left px-3 py-2 rounded-lg text-brand-neon-cyan hover:bg-slate-50 text-sm font-medium transition-colors flex items-center gap-2 mb-1"
                                        >
                                            <Store size={14} />
                                            {t('manageBusiness')}
                                        </button>
                                    )}

                                    <button
                                        onClick={() => router.push(lp('/user/profile'))}
                                        className="w-full text-left px-3 py-2 rounded-lg text-slate-300 hover:bg-slate-50 text-sm font-medium transition-colors flex items-center gap-2 mb-1"
                                    >
                                        <User size={14} />
                                        {t('viewProfile')}
                                    </button>

                                    <button
                                        onClick={() => {
                                            import('@/services/auth.service').then(({ AuthService }) => {
                                                AuthService.logout().then(() => {
                                                    window.location.reload(); // Force refresh to clear state nicely
                                                });
                                            });
                                        }}
                                        className="w-full text-left px-3 py-2 rounded-lg text-slate-300 hover:bg-slate-50 text-sm font-medium transition-colors flex items-center gap-2 mb-1"
                                    >
                                        <span className="w-2 h-2 rounded-full bg-slate-500"></span>
                                        {t('logout')}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center gap-4">
                                {/* Business CTA - Direct register as business, no intermediate screen */}
                                <button
                                    onClick={() => router.push(lp('/auth/register?intent=business'))}
                                    className="hidden md:block text-xs font-bold text-slate-400 hover:text-slate-800 transition-colors"
                                >
                                    {t('isProfessional')} <span className="text-brand-neon-cyan">{t('registerCTA')}</span>
                                </button>

                                <div className="h-4 w-px bg-slate-100 hidden md:block"></div>

                                {/* Entrar → onboarding with mode=login so user picks intent before logging in */}
                                <button
                                    onClick={() => router.push(lp('/onboarding?mode=login'))}
                                    className="text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors px-4 py-2 rounded-full border border-slate-300 hover:border-slate-400"
                                >
                                    {t('login')}
                                </button>
                            </div>
                        )}
                    </div>
                </header>

                {/* Scrollable Content Wrapper */}
                <div className="flex-1 flex flex-col min-h-0">

                    {/* Search Bar - Sticky on Mobile? No, simple flex item */}
                    <div className="shrink-0 px-6 pb-4 z-40">
                        <div className="relative group">
                            <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-purple-600 opacity-20 rounded-2xl blur-md group-hover:opacity-40 transition duration-500"></div>
                            <div className="relative flex items-center bg-white border border-slate-200 rounded-2xl px-5 py-3 shadow-2xl">
                                <Search className="w-6 h-6 text-slate-400 mr-3" />
                                <input
                                    type="text"
                                    placeholder={t('searchPlaceholder')}
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="bg-transparent w-full outline-none text-slate-900 placeholder-slate-400 text-base font-medium"
                                />
                                {searchTerm && (
                                    <button onClick={() => setSearchTerm('')} className="p-1 rounded-full hover:bg-slate-100 transition-colors">
                                        <X className="w-5 h-5 text-slate-400" />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Status Filter Chips */}
                    <div className="shrink-0 px-6 pb-2 flex items-center gap-2 overflow-x-auto no-scrollbar">
                        {(['all', 'new', 'withSchedule'] as const).map((f) => {
                            const labels: Record<string, string> = { all: t('allServices'), new: '🆕 Nuevos', withSchedule: '📅 Con Agenda' };
                            const active = statusFilter === f;
                            return (
                                <button
                                    key={f}
                                    onClick={() => setStatusFilter(f)}
                                    className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${active
                                        ? 'bg-brand-neon-cyan text-black border-brand-neon-cyan shadow-lg shadow-cyan-500/20'
                                        : 'bg-slate-50 text-slate-400 border-slate-200 hover:border-slate-300 hover:text-slate-800'
                                        }`}
                                >
                                    {labels[f]}
                                </button>
                            );
                        })}
                    </div>

                    {/* Categories Row */}
                    <div className="shrink-0 px-6 pb-2">
                        <div className="flex justify-between items-start gap-2 overflow-x-auto no-scrollbar py-2">
                            {categories.map((cat, idx) => (
                                <div
                                    key={idx}
                                    onClick={() => handleCategoryClick(cat.id)}
                                    className="flex flex-col items-center gap-2.5 min-w-[80px] flex-1 cursor-pointer group"
                                >
                                    <div className={`
                     w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center text-3xl
                     ${cat.bg} border ${cat.border}
                     shadow-[0_0_20px_rgba(0,0,0,0.3)]
                     group-hover:scale-110 group-active:scale-95 transition-transform duration-200
                   `}>
                                        <span className="filter drop-shadow-[0_0_6px_rgba(255,255,255,0.6)]">{cat.icon}</span>
                                    </div>
                                    <span className="text-xs sm:text-sm font-semibold text-slate-300 group-hover:text-slate-900 transition-colors text-center leading-tight">{cat.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Map Widget (Responsive Height) */}
                    <div className="shrink-0 mx-6 mb-4 rounded-3xl overflow-hidden border border-slate-200 shadow-2xl group cursor-pointer isolate relative transition-all duration-300 h-[35vh] min-h-[250px] max-h-[400px] md:h-[400px]">
                        <DynamicMap
                            businesses={filteredBusinesses}
                            selectedBusiness={selectedBusiness}
                            onBusinessSelect={handleBusinessClick}
                            onNavigate={handleNavigate}
                            isAuthenticated={!!user}
                            countryCoordinates={selectedCountry?.coordinates}
                            countryCode={selectedCountry?.code}
                        />

                        {/* Map Label (Overlay) */}
                        <div className="absolute bottom-4 left-4 z-[1000] pointer-events-none">
                            <div className="bg-slate-800/90 backdrop-blur px-3 py-1.5 rounded-lg border border-slate-700 flex items-center gap-2">
                                <MapPin className="w-3 h-3 text-cyan-400" />
                                <span className="text-xs font-bold text-white">{selectedCountry?.mainCity || 'San Pedro Sula'} (En Vivo)</span>
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                            </div>
                        </div>
                    </div>

                    {/* Featured Pros List (Scrollable Fill) */}
                    <div className="flex-1 overflow-y-auto px-6 pb-24 space-y-3 custom-scrollbar">
                        {filteredBusinesses.map((biz) => (
                            <div
                                key={biz.id}
                                onClick={() => handleBusinessClick(biz)}
                                className={`flex items-center p-3 bg-white border rounded-2xl transition-all cursor-pointer group
                                ${selectedBusiness?.id === biz.id ? 'border-brand-neon-cyan shadow-[0_0_15px_rgba(0,240,255,0.2)]' : 'border-slate-200 hover:border-slate-200'}
                            `}
                            >
                                <div className="w-12 h-12 rounded-xl bg-slate-100 mr-3 shrink-0 flex items-center justify-center text-xl relative overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-br from-slate-200/50 to-transparent" />
                                    {(biz as any).logoUrl ? (
                                        <img
                                            src={(biz as any).logoUrl}
                                            alt={biz.name}
                                            className="w-full h-full object-cover"
                                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                        />
                                    ) : (
                                        typeof biz.icon === 'string' ? biz.icon : <Zap className="w-5 h-5 text-slate-600" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-slate-900 text-sm truncate">{biz.name}</h3>
                                    <p className="text-[10px] text-brand-neon-cyan font-medium mb-0.5 truncate">
                                        {(() => {
                                            for (const group of Object.values(TAXONOMY)) {
                                                const sub = group.subcategories.find(s => s.id === biz.subcategory);
                                                if (sub) return sub.label[localeKey as keyof typeof sub.label] ?? sub.label.es;
                                            }
                                            return biz.subcategory;
                                        })()}
                                    </p>
                                    <div className="flex items-center gap-1">
                                        <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                                        <span className="text-yellow-400 font-bold text-[10px]">5.0</span>
                                        <span className="text-slate-500 text-[10px] truncate">(San Pedro Sula)</span>
                                    </div>
                                </div>
                                {/* Action hint for logged out users */}
                                <div className="hidden group-hover:flex items-center px-2 py-1 bg-slate-100 rounded-full text-[10px] text-slate-700 font-medium whitespace-nowrap">
                                    {t('viewBtn')}
                                </div>
                            </div>
                        ))}
                        {filteredBusinesses.length === 0 && searchTerm && (
                            <div className="flex flex-col items-center justify-center py-10 text-slate-500 text-sm animate-in fade-in zoom-in duration-300">
                                <p>{t('noResultsFor', { term: searchTerm })}</p>

                                {/* Suggestion UI */}
                                {suggestion && (
                                    <div className="mt-4 flex flex-col items-center gap-2">
                                        <p className="text-xs text-slate-400">{t('didYouMean')}</p>
                                        <button
                                            onClick={() => setSearchTerm(suggestion)}
                                            className="px-4 py-2 bg-brand-neon-cyan/10 border border-brand-neon-cyan/20 rounded-full text-brand-neon-cyan font-bold hover:bg-brand-neon-cyan/20 transition-all flex items-center gap-2"
                                        >
                                            <Zap className="w-4 h-4 fill-current" />
                                            {suggestion}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Modals placed here or at root */}
                    <PublicBusinessPreviewModal
                        isOpen={showAuthModal}
                        onClose={() => setShowAuthModal(false)}
                        business={pendingBusiness}
                    />

                    {/* Categories Detail Modal */}
                    {selectedCategory && selectedTaxonomy && (
                        <div className="fixed inset-0 z-[2000] flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                            <div className="bg-white w-full max-w-lg rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in slide-in-from-bottom duration-300">

                                {/* Header */}
                                <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-[#F8FAFC]">
                                    <div>
                                        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                            {categories.find(c => c.id === selectedCategory)?.icon}
                                            {selectedTaxonomy.label[localeKey as keyof typeof selectedTaxonomy.label]}
                                        </h2>
                                        <p className="text-xs text-slate-400 mt-1">{t('exploreServices')}</p>
                                    </div>
                                    <button
                                        onClick={() => setSelectedCategory(null)}
                                        className="p-2 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-800 transition-colors"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                {/* Scrollable Content */}
                                <div className="overflow-y-auto p-4 space-y-4 custom-scrollbar">
                                    {selectedTaxonomy.subcategories.map((sub) => (
                                        <div key={sub.id} className="bg-[#F8FAFC] rounded-2xl p-4 border border-slate-200 hover:border-slate-300 transition-colors">
                                            <h3 className="font-bold text-brand-neon-cyan mb-3 flex items-center gap-2">
                                                <span className="w-1.5 h-1.5 rounded-full bg-brand-neon-cyan"></span>
                                                {sub.label[localeKey as keyof typeof sub.label]}
                                            </h3>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                {sub.specialties.map((spec, i) => (
                                                    <div
                                                        key={i}
                                                        onClick={() => {
                                                            // Always search with ES key — Firestore tags are stored in Spanish
                                                            setSearchTerm((spec as any).es);
                                                            setSelectedCategory(null);
                                                        }}
                                                        className="flex items-center gap-2 text-sm text-slate-700 bg-slate-50 px-3 py-2 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors group/item"
                                                    >
                                                        <ChevronRight className="w-3 h-3 text-slate-600 group-hover/item:text-brand-neon-cyan" />
                                                        {(spec as any)[localeKey] ?? (spec as any).es}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Footer */}
                                <div className="p-4 border-t border-slate-200 bg-[#F8FAFC]">
                                    <button
                                        onClick={() => setSelectedCategory(null)}
                                        className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold text-sm hover:opacity-90 transition-opacity"
                                    >
                                        {t('closeExplorer')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            </main>

            {/* Share App Modal */}
            <ShareAppModal isOpen={showShare} onClose={() => setShowShare(false)} />
        </>
    );
}
