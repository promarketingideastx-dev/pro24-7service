'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { Search, MapPin, Star, Bell, Filter, Grid, Zap, User, X, ChevronRight, Store, Share2, Wrench, Sparkles, Palette, LucideIcon } from 'lucide-react';
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
import SearchAutocomplete from '@/components/ui/SearchAutocomplete';

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
    const [showAutocomplete, setShowAutocomplete] = useState(false);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const [statusFilter, setStatusFilter] = useState<'all' | 'new' | 'withSchedule'>('all');
    /* State for Category Modal */
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    /* State for Selected Business (Map Focus) */
    const [selectedBusiness, setSelectedBusiness] = useState<BusinessMock | null>(null);

    /* Advanced Filters */
    const [showFilters, setShowFilters] = useState(false);
    const [filterCategory, setFilterCategory] = useState<string | null>(null);
    const [filterRating, setFilterRating] = useState<number>(0);
    const [filterHasSchedule, setFilterHasSchedule] = useState(false);
    const activeFilterCount = (filterCategory ? 1 : 0) + (filterRating > 0 ? 1 : 0) + (filterHasSchedule ? 1 : 0);

    /* Map state: collapsed by default on mobile, gesture lock */
    const [mapExpanded, setMapExpanded] = useState(false);
    const [mapActive, setMapActive] = useState(false);
    const mapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const activateMap = useCallback(() => {
        setMapActive(true);
        if (mapTimerRef.current) clearTimeout(mapTimerRef.current);
        mapTimerRef.current = setTimeout(() => setMapActive(false), 4000);
    }, []);

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
    const categories: { id: string; name: string; icon: LucideIcon; color: string; border: string; bg: string; iconColor: string }[] = [
        { id: 'general_services', name: t('cat_generalServices'), icon: Wrench, color: 'text-blue-400', border: 'border-blue-500/30', bg: 'bg-blue-500/8', iconColor: '#3B82F6' },
        { id: 'beauty_wellness', name: t('cat_beautyWellness'), icon: Sparkles, color: 'text-pink-400', border: 'border-pink-500/30', bg: 'bg-pink-500/8', iconColor: '#EC4899' },
        { id: 'art_design', name: t('cat_artDesign'), icon: Palette, color: 'text-purple-400', border: 'border-purple-500/30', bg: 'bg-purple-500/8', iconColor: '#A855F7' },
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
            const bizCountry = b.countryCode || 'HN';
            if (bizCountry !== selectedCountry.code) return false;
        }

        const term = searchTerm.trim();
        if (!term) return true;

        // Helper: extract text from a tag that may be a string or {es, en, pt} object
        const tagText = (tag: any) => typeof tag === 'string' ? tag : Object.values(tag || {}).join(' ');
        const allTags = (b as any).tags || [];
        const allSubcategories = (b as any).subcategories || (b.subcategory ? [b.subcategory] : []);
        // specialtiesBySubcategory: { subcatId: [{es,en,pt},...] } — extract all labels
        const specialtiesBySubcat = (b as any).specialtiesBySubcategory || {};
        const allSpecialtyTexts = Object.values(specialtiesBySubcat)
            .flat()
            .map(tagText)
            .join(' ');

        const searchableText = [
            b.name,
            b.category,
            allSubcategories.join(' '),
            allTags.map(tagText).join(' '),
            allSpecialtyTexts,
            b.description || '',
        ].join(' ');

        return matchesSearch(searchableText, term);
    }).filter(b => {
        if (statusFilter === 'new') {
            const rawDate = (b as any).createdAt ?? (b as any).updatedAt;
            const created = rawDate?.toDate?.() ?? (rawDate ? new Date(rawDate) : null);
            if (!created) return false;
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            return created >= thirtyDaysAgo;
        }
        if (statusFilter === 'withSchedule') {
            return !!(b as any).openingHours || !!(b as any).hasSchedule;
        }
        return true;
    }).filter(b => {
        // Advanced filters
        if (filterCategory) {
            // Check main category OR subcategories[] OR legacy subcategory field
            const subcats = (b as any).subcategories || (b.subcategory ? [b.subcategory] : []);
            const matchesMainCat = b.category === filterCategory;
            const matchesSubCat = subcats.includes(filterCategory);
            if (!matchesMainCat && !matchesSubCat) return false;
        }
        if (filterRating > 0 && ((b as any).rating ?? 5.0) < filterRating) return false;
        if (filterHasSchedule && !((b as any).openingHours || (b as any).hasSchedule)) return false;
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
                <header className="shrink-0 bg-gradient-to-br from-slate-800 to-slate-900 px-5 pt-5 pb-5 z-50">

                    {/* Row 1: Country + Actions */}
                    <div className="flex items-center justify-between mb-4">

                        {/* Left: Country Selector */}
                        <button onClick={clearCountry} className="flex items-center gap-2.5 group">
                            <div className="w-8 h-6 rounded-sm overflow-hidden shadow ring-1 ring-white/30">
                                <img
                                    src={`https://flagcdn.com/w40/${selectedCountry.code.toLowerCase()}.png`}
                                    alt={selectedCountry.name}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            <span className="text-white font-bold text-xl leading-none group-hover:text-white/80 transition-colors">
                                {selectedCountry.name}
                            </span>
                            <MapPin className="w-4 h-4 text-white/70 group-hover:text-white transition-colors" />
                        </button>

                        {/* Right: Share + Login/Avatar */}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setShowShare(true)}
                                title={t('share')}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#14B8A6] hover:bg-[#0F9488] text-white text-sm font-semibold shadow-[0_4px_12px_rgba(20,184,166,0.35)] transition-all"
                            >
                                <Share2 size={16} />
                                <span>{t('share')}</span>
                            </button>

                            {user ? (
                                <div className="flex items-center gap-2 group relative">
                                    {userProfile?.roles?.provider && (
                                        <button
                                            onClick={() => router.push(lp('/business/dashboard'))}
                                            className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition-all"
                                        >
                                            <Store className="w-3 h-3" />
                                            {t('manageMyBusiness')}
                                        </button>
                                    )}
                                    <button className="w-10 h-10 rounded-full bg-white/20 border-2 border-white/50 p-0.5 overflow-hidden transition-transform hover:scale-105">
                                        {user.photoURL ? (
                                            <img src={user.photoURL} alt="User" className="w-full h-full rounded-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full bg-white text-[#0F766E] flex items-center justify-center font-bold text-sm">
                                                {user.email?.[0].toUpperCase() || 'U'}
                                            </div>
                                        )}
                                    </button>
                                    {/* Dropdown */}
                                    <div className="absolute top-12 right-0 w-48 bg-white border border-slate-200 rounded-xl shadow-2xl p-2 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all z-50">
                                        <div className="px-3 py-2 border-b border-slate-200 mb-1">
                                            <p className="text-xs text-slate-400">{t('loggedInAs')}</p>
                                            <p className="text-sm text-slate-800 font-medium truncate">{user.email}</p>
                                        </div>
                                        {userProfile?.roles?.provider && (
                                            <button
                                                onClick={() => router.push(lp('/business/dashboard'))}
                                                className="w-full text-left px-3 py-2 rounded-lg text-[#14B8A6] hover:bg-slate-50 text-sm font-medium transition-colors flex items-center gap-2 mb-1"
                                            >
                                                <Store size={14} />
                                                {t('manageBusiness')}
                                            </button>
                                        )}
                                        <button
                                            onClick={() => router.push(lp('/user/profile'))}
                                            className="w-full text-left px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-50 text-sm font-medium transition-colors flex items-center gap-2 mb-1"
                                        >
                                            <User size={14} />
                                            {t('viewProfile')}
                                        </button>
                                        <button
                                            onClick={() => {
                                                import('@/services/auth.service').then(({ AuthService }) => {
                                                    AuthService.logout().then(() => window.location.reload());
                                                });
                                            }}
                                            className="w-full text-left px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-50 text-sm font-medium transition-colors flex items-center gap-2"
                                        >
                                            <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                                            {t('logout')}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    onClick={() => router.push(lp('/onboarding?mode=login'))}
                                    className="bg-white text-[#0F766E] font-bold text-sm px-5 py-2.5 rounded-xl shadow-[0_4px_14px_rgba(0,0,0,0.15)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.20)] active:scale-95 transition-all"
                                >
                                    {t('login')}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Row 2: Search bar — with autocomplete */}
                    <div className="relative">
                        <div className="flex items-center bg-white rounded-2xl px-5 py-3.5 shadow-md gap-2">
                            <Search className="w-5 h-5 text-slate-400 shrink-0" />
                            <input
                                ref={searchInputRef}
                                type="text"
                                placeholder={t('searchPlaceholder')}
                                value={searchTerm}
                                onChange={(e) => { setSearchTerm(e.target.value); setShowAutocomplete(true); }}
                                onFocus={() => setShowAutocomplete(true)}
                                onBlur={() => setTimeout(() => setShowAutocomplete(false), 150)}
                                onKeyDown={(e) => { if (e.key === 'Escape' || e.key === 'Enter') setShowAutocomplete(false); }}
                                className="bg-transparent w-full outline-none text-slate-900 placeholder-slate-400 text-base font-medium"
                            />
                            {searchTerm && (
                                <button onClick={() => { setSearchTerm(''); setShowAutocomplete(false); }} className="p-1 rounded-full hover:bg-slate-100 transition-colors shrink-0">
                                    <X className="w-5 h-5 text-slate-400" />
                                </button>
                            )}
                            {/* Filter Button */}
                            <button
                                onClick={() => setShowFilters(true)}
                                className={`relative shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold border transition-all ${activeFilterCount > 0
                                    ? 'bg-[#14B8A6] text-white border-[#14B8A6] shadow-md shadow-teal-500/20'
                                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-[#14B8A6]/50'
                                    }`}
                            >
                                <Filter className="w-4 h-4" />
                                {activeFilterCount > 0 && (
                                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                                        {activeFilterCount}
                                    </span>
                                )}
                            </button>
                        </div>

                        {/* Autocomplete Dropdown */}
                        {showAutocomplete && searchTerm.trim().length >= 2 && (
                            <SearchAutocomplete
                                query={searchTerm}
                                businesses={businesses}
                                locale={localeKey as 'es' | 'en' | 'pt'}
                                onSelect={(value) => { setSearchTerm(value); setShowAutocomplete(false); }}
                                onClose={() => setShowAutocomplete(false)}
                            />
                        )}
                    </div>
                </header>

                {/* Scrollable Content Wrapper */}
                <div className="flex-1 flex flex-col min-h-0">



                    {/* Status Filter Chips */}
                    <div className="shrink-0 px-6 pt-3 pb-2 flex items-center gap-2 overflow-x-auto no-scrollbar">
                        {(['all', 'new', 'withSchedule'] as const).map((f) => {
                            const labels: Record<string, string> = { all: t('allServices'), new: '🆕 Nuevos', withSchedule: '📅 Con Agenda' };
                            const active = statusFilter === f;
                            return (
                                <button
                                    key={f}
                                    onClick={() => setStatusFilter(f)}
                                    className={`shrink-0 px-4 py-2 rounded-full text-sm font-semibold border transition-all ${active
                                        ? 'bg-[#14B8A6] text-white border-[#14B8A6] shadow-md shadow-teal-500/20'
                                        : 'bg-white text-slate-700 border-slate-300 hover:border-[#14B8A6]/50 hover:text-[#0F766E]'
                                        }`}
                                >
                                    {labels[f]}
                                </button>
                            );
                        })}
                    </div>

                    {/* Categories Row */}
                    <div className="shrink-0 px-6 pb-0">
                        <div className="flex justify-between items-start gap-2 overflow-x-auto no-scrollbar py-1">
                            {categories.map((cat, idx) => (
                                <div
                                    key={idx}
                                    onClick={() => handleCategoryClick(cat.id)}
                                    className="flex flex-col items-center gap-2 min-w-[72px] flex-1 cursor-pointer group"
                                >
                                    <div className={`
                     w-[58px] h-[58px] sm:w-[72px] sm:h-[72px] rounded-2xl flex items-center justify-center text-2xl sm:text-3xl
                     ${cat.bg} border ${cat.border}
                     shadow-sm
                     group-hover:scale-110 group-active:scale-95 transition-transform duration-200
                   `}>
                                        <cat.icon size={26} color={cat.iconColor} strokeWidth={1.75} />
                                    </div>
                                    <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900 transition-colors text-center leading-tight">{cat.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Map Widget — collapsible with gesture lock overlay */}
                    <div
                        className="shrink-0 mx-6 mb-2 rounded-3xl overflow-hidden border border-slate-200 shadow-2xl isolate relative transition-all duration-500 ease-in-out"
                        style={{ height: mapExpanded ? 'min(35vh, 400px)' : '130px' }}
                    >
                        <DynamicMap
                            businesses={filteredBusinesses}
                            selectedBusiness={selectedBusiness}
                            onBusinessSelect={handleBusinessClick}
                            onNavigate={handleNavigate}
                            isAuthenticated={!!user}
                            countryCoordinates={selectedCountry?.coordinates}
                            countryCode={selectedCountry?.code}
                        />

                        {/* Gesture Lock Overlay (mobile) — blocks accidental map pan */}
                        {!mapActive && (
                            <div
                                className="absolute inset-0 z-[1001] flex items-center justify-center md:hidden"
                                onTouchStart={activateMap}
                                onClick={activateMap}
                                style={{ cursor: 'pointer' }}
                            >
                                {/* Semi-transparent center badge */}
                                <div className="bg-slate-900/60 backdrop-blur-sm rounded-2xl px-4 py-2.5 flex items-center gap-2 shadow-xl border border-white/10">
                                    <span className="text-base">👆</span>
                                    <span className="text-sm font-semibold text-white">Toca para interactuar</span>
                                </div>
                            </div>
                        )}

                        {/* Live badge bottom-left */}
                        <div className="absolute bottom-3 left-3 z-[1000] pointer-events-none">
                            <div className="bg-slate-800/90 backdrop-blur px-3 py-1.5 rounded-lg border border-slate-700 flex items-center gap-2">
                                <MapPin className="w-3 h-3 text-cyan-400" />
                                <span className="text-xs font-bold text-white">{selectedCountry?.mainCity || 'San Pedro Sula'} (En Vivo)</span>
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                            </div>
                        </div>

                        {/* Expand / Collapse toggle — bottom-right */}
                        <button
                            onClick={() => { setMapExpanded(v => !v); setMapActive(false); }}
                            className="absolute bottom-3 right-3 z-[1002] flex items-center gap-1.5 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-lg border border-slate-200 text-xs font-bold text-slate-700 hover:bg-white transition-all"
                        >
                            {mapExpanded ? (
                                <><span>↑</span> Minimizar</>
                            ) : (
                                <><span>↓</span> Expandir mapa</>
                            )}
                        </button>
                    </div>

                    {/* Featured Pros List (Scrollable Fill) */}
                    <div className="flex-1 overflow-y-auto px-6 pb-24 space-y-3 custom-scrollbar">
                        {filteredBusinesses.map((biz) => (
                            <div
                                key={biz.id}
                                onClick={() => handleBusinessClick(biz)}
                                className={`flex items-center p-3 bg-white border rounded-2xl transition-all cursor-pointer group
                                ${selectedBusiness?.id === biz.id ? 'border-[#14B8A6] shadow-[0_0_0_2px_rgba(20,184,166,0.15)]' : 'border-[#E6E8EC] hover:border-[#14B8A6]/40 hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)]'}
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
                                    <p className="text-[10px] text-[#2563EB] font-semibold mb-0.5 truncate">
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
                                <div className="hidden group-hover:flex items-center px-2 py-1 bg-[rgba(20,184,166,0.10)] rounded-full text-[10px] text-[#0F766E] font-semibold whitespace-nowrap border border-[#14B8A6]/20">
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
                                            className="px-4 py-2 bg-[rgba(20,184,166,0.10)] border border-[#14B8A6]/30 rounded-full text-[#14B8A6] font-bold hover:bg-[rgba(20,184,166,0.20)] transition-all flex items-center gap-2"
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
                                            {(() => { const CatIcon = categories.find(c => c.id === selectedCategory)?.icon; return CatIcon ? <CatIcon size={22} color={categories.find(c => c.id === selectedCategory)?.iconColor} /> : null; })()}
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
                                            <h3 className="text-base font-bold text-[#2563EB] mb-3 flex items-center gap-2">
                                                <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB]"></span>
                                                {sub.label[localeKey as keyof typeof sub.label]}
                                            </h3>
                                            <div className="flex flex-wrap gap-2">
                                                {sub.specialties.map((spec, i) => (
                                                    <button
                                                        key={i}
                                                        onClick={() => {
                                                            setSearchTerm((spec as any).es);
                                                            setSelectedCategory(null);
                                                        }}
                                                        className="flex items-center gap-1.5 bg-white border border-slate-200 shadow-sm rounded-xl px-3 py-2 text-[14px] text-slate-700 hover:bg-[rgba(20,184,166,0.06)] hover:border-[#14B8A6]/50 hover:text-[#0F766E] cursor-pointer transition-all group/item active:scale-95"
                                                    >
                                                        <ChevronRight className="w-3 h-3 text-slate-400 group-hover/item:text-[#14B8A6] shrink-0 transition-colors" />
                                                        <span>{(spec as any)[localeKey] ?? (spec as any).es}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Footer */}
                                <div className="p-4 border-t border-slate-200 bg-[#F8FAFC]">
                                    <button
                                        onClick={() => setSelectedCategory(null)}
                                        className="w-full py-3 rounded-xl bg-[#14B8A6] hover:bg-[#0F9488] text-white font-bold text-sm shadow-[0_4px_14px_rgba(20,184,166,0.30)] hover:shadow-[0_6px_20px_rgba(20,184,166,0.45)] transition-all"
                                    >
                                        {t('closeExplorer')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                </div>

                {/* ── Advanced Filters Bottom Sheet ── */}
                {showFilters && (
                    <div className="fixed inset-0 z-[2000] flex items-end justify-center" onClick={() => setShowFilters(false)}>
                        {/* Backdrop */}
                        <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" />
                        {/* Sheet */}
                        <div
                            className="relative w-full max-w-lg bg-white rounded-t-3xl shadow-2xl p-6 pb-10 animate-in slide-in-from-bottom duration-300"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Handle */}
                            <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-5" />

                            {/* Header */}
                            <div className="flex items-center justify-between mb-5">
                                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                    <Filter className="w-5 h-5 text-[#14B8A6]" />
                                    Filtros
                                </h3>
                                {activeFilterCount > 0 && (
                                    <button
                                        onClick={() => { setFilterCategory(null); setFilterRating(0); setFilterHasSchedule(false); }}
                                        className="text-xs text-red-500 font-semibold hover:text-red-600 transition-colors"
                                    >
                                        Limpiar filtros
                                    </button>
                                )}
                            </div>

                            {/* Section: Categoría */}
                            <div className="mb-5">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Categoría</p>
                                <div className="flex flex-wrap gap-2">
                                    {[{ id: null, label: 'Todas' }, { id: 'general_services', label: '🛠️ Servicios' }, { id: 'beauty_wellness', label: '💇 Belleza' }, { id: 'art_design', label: '🎨 Arte' }].map(opt => (
                                        <button
                                            key={opt.label}
                                            onClick={() => setFilterCategory(opt.id)}
                                            className={`px-4 py-2 rounded-full text-sm font-semibold border transition-all ${filterCategory === opt.id
                                                ? 'bg-[#14B8A6] text-white border-[#14B8A6]'
                                                : 'bg-white text-slate-700 border-slate-200 hover:border-[#14B8A6]/50'
                                                }`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Section: Rating */}
                            <div className="mb-5">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Rating mínimo</p>
                                <div className="flex gap-2">
                                    {[{ val: 0, label: 'Cualquiera' }, { val: 4, label: '4+ ⭐' }, { val: 5, label: '5.0 ⭐' }].map(opt => (
                                        <button
                                            key={opt.val}
                                            onClick={() => setFilterRating(opt.val)}
                                            className={`px-4 py-2 rounded-full text-sm font-semibold border transition-all ${filterRating === opt.val
                                                ? 'bg-[#14B8A6] text-white border-[#14B8A6]'
                                                : 'bg-white text-slate-700 border-slate-200 hover:border-[#14B8A6]/50'
                                                }`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Section: Con Agenda */}
                            <div className="mb-6">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Opciones</p>
                                <button
                                    onClick={() => setFilterHasSchedule(v => !v)}
                                    className={`flex items-center gap-3 w-full px-4 py-3 rounded-2xl border text-sm font-semibold transition-all ${filterHasSchedule
                                        ? 'bg-[#14B8A6]/10 text-[#0F766E] border-[#14B8A6]/40'
                                        : 'bg-white text-slate-700 border-slate-200 hover:border-[#14B8A6]/30'
                                        }`}
                                >
                                    <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${filterHasSchedule ? 'bg-[#14B8A6] border-[#14B8A6]' : 'border-slate-300'
                                        }`}>
                                        {filterHasSchedule && <span className="w-2 h-2 bg-white rounded-full" />}
                                    </span>
                                    📅 Solo con agenda disponible
                                </button>
                            </div>

                            {/* Apply Button */}
                            <button
                                onClick={() => setShowFilters(false)}
                                className="w-full py-3.5 rounded-2xl bg-[#14B8A6] hover:bg-[#0F9488] text-white font-bold text-sm shadow-[0_4px_14px_rgba(20,184,166,0.30)] transition-all"
                            >
                                {activeFilterCount > 0 ? `Aplicar ${activeFilterCount} filtro${activeFilterCount > 1 ? 's' : ''}` : 'Cerrar'}
                            </button>
                        </div>
                    </div>
                )}
            </main>

            {/* Share App Modal */}
            <ShareAppModal isOpen={showShare} onClose={() => setShowShare(false)} />
        </>
    );
}
