'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { Search, MapPin, Star, Bell, Filter, Grid, Zap, User, X, ChevronRight, Store, Share2, Navigation } from 'lucide-react';
import { haversineKm, formatDistance } from '@/lib/geoUtils';
import { DEMO_BUSINESSES, BusinessMock } from '@/data/mockBusinesses';
import { TAXONOMY } from '@/lib/taxonomy';
import { matchesSearch, findSuggestion } from '@/lib/searchUtils';
import { useCountry } from '@/context/CountryContext';
import CountrySelector from '@/components/ui/CountrySelector';
import HeroCarousel from '@/components/ui/HeroCarousel';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import PublicBusinessPreviewModal from '@/components/ui/PublicBusinessPreviewModal';
import LanguageSwitcher from '@/components/ui/LanguageSwitcher';
import ShareAppModal from '@/components/ui/ShareAppModal';
import SearchAutocomplete from '@/components/ui/SearchAutocomplete';
import ClientNotifBell from '@/components/ui/ClientNotifBell';

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

    /* Geolocation */
    const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
    const [geoLoading, setGeoLoading] = useState(false);
    const [geoError, setGeoError] = useState<string | null>(null);
    const [filterMaxKm, setFilterMaxKm] = useState<number>(0); // 0 = sin límite
    const [revealedCardId, setRevealedCardId] = useState<string | null>(null);

    const activeFilterCount = (filterCategory ? 1 : 0) + (filterRating > 0 ? 1 : 0) + (filterHasSchedule ? 1 : 0) + (filterMaxKm > 0 ? 1 : 0);

    const requestLocation = () => {
        setGeoLoading(true);
        setGeoError(null);
        if (!navigator.geolocation) {
            setGeoError('Tu navegador no soporta geolocalización');
            setGeoLoading(false);
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                setGeoLoading(false);
            },
            () => {
                setGeoError('No se pudo obtener tu ubicación. Verifica los permisos.');
                setGeoLoading(false);
            },
            { timeout: 10000 }
        );
    };

    /* Map state: collapsed by default on mobile, gesture lock */
    const [mapExpanded, setMapExpanded] = useState(false);
    const [mapActive, setMapActive] = useState(false);
    const mapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    // Pull-to-refresh (iOS doesn't support native PTR on inner overflow divs)
    const listRef = useRef<HTMLDivElement>(null);
    const ptrStartY = useRef<number | null>(null);
    const [ptrDistance, setPtrDistance] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const PTR_THRESHOLD = 65;
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
    const categories = [
        { id: 'general_services', name: t('cat_generalServices'), icon: '🛠️', color: 'text-blue-400', border: 'border-blue-500/30', bg: 'bg-blue-500/10' },
        { id: 'beauty_wellness', name: t('cat_beautyWellness'), icon: '🫶', color: 'text-pink-400', border: 'border-pink-500/30', bg: 'bg-pink-500/10' },
        { id: 'art_design', name: t('cat_artDesign'), icon: '🎥', color: 'text-purple-400', border: 'border-purple-500/30', bg: 'bg-purple-500/10' },
        { id: 'health_medicine', name: t('cat_healthMedicine'), icon: '🩺', color: 'text-emerald-400', border: 'border-emerald-500/30', bg: 'bg-emerald-500/10' },
    ];

    const [showAuthModal, setShowAuthModal] = useState(false);
    const [pendingBusiness, setPendingBusiness] = useState<BusinessMock | null>(null);

    // Effect: Load real businesses from Firestore
    useEffect(() => {
        const loadData = async () => {
            try {
                // Dynamically import service to avoid server-side issues if any
                const { BusinessProfileService } = await import('@/services/businessProfile.service');
                const realBiz = await BusinessProfileService.getPublicBusinesses(selectedCountry?.code);

                let combined = realBiz || [];

                // Strict Mock Logic: Only add demos if flag is explicitly true
                if (process.env.NEXT_PUBLIC_USE_MOCKS === 'true') {
                    const { DEMO_BUSINESSES } = await import('@/data/mockBusinesses');
                    // In a real app we might filter mocks by country too, but for now we just append them all or filter simple
                    const countryMocks = selectedCountry ? DEMO_BUSINESSES.filter(b => b.countryCode === selectedCountry.code || b.countryCode === 'Global' || !b.countryCode) : DEMO_BUSINESSES;
                    combined = [...countryMocks, ...combined];
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

        if (!isCountryLoading) {
            loadData();
        }
    }, [selectedCountry?.code, isCountryLoading]);

    const handleNavigate = (biz: BusinessMock) => {
        if (!user) {
            setPendingBusiness(biz);
            setShowAuthModal(true);
        } else {
            router.push(lp(`/negocio/${biz.id}`));
        }
    };

    const handleBusinessClick = (biz: BusinessMock) => {
        setSelectedBusiness(biz);
        handleNavigate(biz);
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
        if (filterRating > 0 && ((b as any).rating ?? 0) < filterRating) return false;
        if (filterHasSchedule && !((b as any).openingHours || (b as any).hasSchedule)) return false;
        return true;
    }).filter(b => {
        // Distance filter
        const referenceCoords = userCoords || (selectedCountry ? { lat: selectedCountry.coordinates.lat, lng: selectedCountry.coordinates.lng } : null);
        if (!referenceCoords || filterMaxKm === 0) return true;
        const bizLat = (b as any).location?.lat ?? b.lat;
        const bizLng = (b as any).location?.lng ?? b.lng;
        if (bizLat == null || bizLng == null) return true; // no coords → include
        const dist = haversineKm(referenceCoords.lat, referenceCoords.lng, bizLat, bizLng);
        return dist <= filterMaxKm;
    }).sort((a, b) => {
        // Sort by distance when user location OR country location is known
        const referenceCoords = userCoords || (selectedCountry ? { lat: selectedCountry.coordinates.lat, lng: selectedCountry.coordinates.lng } : null);
        if (!referenceCoords) return 0;
        const aLat = (a as any).location?.lat ?? a.lat;
        const aLng = (a as any).location?.lng ?? a.lng;
        const bLat = (b as any).location?.lat ?? b.lat;
        const bLng = (b as any).location?.lng ?? b.lng;
        if (aLat == null || bLat == null) return 0;
        const distA = haversineKm(referenceCoords.lat, referenceCoords.lng, aLat, aLng);
        const distB = haversineKm(referenceCoords.lat, referenceCoords.lng, bLat, bLng);
        return distA - distB;
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
            <main className="h-dvh bg-[#F4F6F8] text-slate-900 overflow-hidden font-sans flex flex-col" style={{ height: '100dvh' }}>
                {/* ── Header ── */}
                <header className="shrink-0 bg-gradient-to-br from-slate-800 to-slate-900 px-4 pt-3 pb-3 sm:px-5 sm:pt-5 sm:pb-5 z-50">

                    {/* Row 1: Country + Actions */}
                    <div className="flex items-center justify-between mb-2 sm:mb-4">

                        {/* Left: Country Selector */}
                        <button onClick={clearCountry} className="flex items-center gap-2.5 group">
                            <div className="w-8 h-6 rounded-sm overflow-hidden shadow ring-1 ring-white/30">
                                <img
                                    src={`https://flagcdn.com/w40/${selectedCountry.code.toLowerCase()}.png`}
                                    alt={selectedCountry.name}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            <span className="text-white font-bold text-sm sm:text-xl leading-none group-hover:text-white/80 transition-colors">
                                {selectedCountry.name}
                            </span>
                            <MapPin className="w-3 h-3 sm:w-4 sm:h-4 text-white/70 group-hover:text-white transition-colors" />
                        </button>

                        {/* Right: Share + Login/Avatar */}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setShowShare(true)}
                                title={t('share')}
                                className="flex items-center gap-1.5 px-2 py-1.5 sm:px-3 sm:py-2 rounded-xl bg-[#14B8A6] hover:bg-[#0F9488] text-white text-sm font-semibold shadow-[0_4px_12px_rgba(20,184,166,0.35)] transition-all"
                            >
                                <Share2 size={16} />
                                <span className="hidden sm:inline">{t('share')}</span>
                            </button>

                            {/* Language Switcher */}
                            <LanguageSwitcher variant="icon" />

                            {/* Client Notification Bell — only for logged-in users */}
                            {user && <ClientNotifBell clientUid={user.uid} />}

                            {user ? (
                                <div className="flex items-center gap-2 group relative">
                                    {(userProfile?.roles?.provider || userProfile?.role === 'provider' || userProfile?.isAdmin) && (
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
                                        {(userProfile?.roles?.provider || userProfile?.role === 'provider' || userProfile?.isAdmin) && (
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
                        <div className="flex items-center bg-white rounded-2xl px-4 py-2.5 sm:px-5 sm:py-3.5 shadow-md gap-2">
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
                    <div className="shrink-0 px-4 pt-2 pb-1 sm:px-6 sm:pt-3 sm:pb-2 flex items-center gap-2 overflow-x-auto no-scrollbar">
                        {(['all', 'new', 'withSchedule'] as const).map((f) => {
                            const labels: Record<string, string> = { all: t('allServices'), new: `🆕 ${t('tabs.new')}`, withSchedule: `📅 ${t('tabs.withSchedule')}` };
                            const active = statusFilter === f;
                            return (
                                <button
                                    key={f}
                                    onClick={() => setStatusFilter(f)}
                                    className={`shrink-0 px-3 py-1 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-semibold border transition-all ${active
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
                    <div className="shrink-0 px-3 sm:px-6 pb-0">
                        <div className="grid grid-cols-4 gap-2 py-1">
                            {categories.map((cat, idx) => (
                                <div
                                    key={idx}
                                    onClick={() => handleCategoryClick(cat.id)}
                                    className="flex flex-col items-center gap-1 sm:gap-2 cursor-pointer group"
                                >
                                    <div className={`
                     w-16 h-16 sm:w-[72px] sm:h-[72px] md:w-[88px] md:h-[88px] rounded-2xl sm:rounded-3xl flex items-center justify-center text-3xl sm:text-4xl md:text-5xl
                     ${cat.bg} border-2 ${cat.border}
                     shadow-md
                     group-hover:scale-110 group-active:scale-95 transition-transform duration-200
                   `}>
                                        <span>{cat.icon}</span>
                                    </div>
                                    <span className="text-base sm:text-sm md:text-base font-normal text-slate-700 text-center leading-tight w-full">{cat.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Hero Carousel — replaces map */}
                    <div className="shrink-0 mx-3 mb-4 sm:mx-6 sm:mb-5 rounded-2xl sm:rounded-3xl overflow-hidden border border-slate-200 shadow-xl" style={{ height: 'clamp(120px, 23vh, 260px)' }}>
                        <HeroCarousel
                            slides={[
                                {
                                    image: '/carousel/s1_servicios.png',
                                    category: t('cat_generalServices'),
                                    title: 'Tu problema resuelto hoy',
                                    subtitle: 'Plomeros, electricistas y más — disponibles ahora',
                                    ctaLabel: 'Ver Servicios',
                                    categoryId: 'general_services',
                                    color: '#2563EB',
                                },
                                {
                                    image: '/carousel/s2_belleza.png',
                                    category: t('cat_beautyWellness'),
                                    title: 'Date el cuidado que mereces',
                                    subtitle: 'Estilistas, spas y más — para ti',
                                    ctaLabel: 'Ver Belleza',
                                    categoryId: 'beauty_wellness',
                                    color: '#DB2777',
                                },
                                {
                                    image: '/carousel/s3_arte.png',
                                    category: t('cat_artDesign'),
                                    title: 'Crea algo memorable',
                                    subtitle: 'Fotógrafos, videógrafos y creativos — aquí',
                                    ctaLabel: 'Ver Arte',
                                    categoryId: 'art_design',
                                    color: '#7C3AED',
                                },
                                {
                                    image: '/carousel/s4_servicios_accion.png',
                                    category: t('cat_generalServices'),
                                    title: 'Profesionales en acción',
                                    subtitle: 'Expertos listos para ayudarte hoy mismo',
                                    ctaLabel: 'Ver Servicios',
                                    categoryId: 'general_services',
                                    color: '#2563EB',
                                },
                                {
                                    image: '/carousel/s5_belleza_accion.png',
                                    category: t('cat_beautyWellness'),
                                    title: 'Manos expertas, resultados reales',
                                    subtitle: 'Tu próxima cita te está esperando',
                                    ctaLabel: 'Ver Belleza',
                                    categoryId: 'beauty_wellness',
                                    color: '#DB2777',
                                },
                                {
                                    image: '/carousel/s6_arte_accion.png',
                                    category: t('cat_artDesign'),
                                    title: 'Tu historia, bien contada',
                                    subtitle: 'Videógrafos y creativos al servicio de tu marca',
                                    ctaLabel: 'Ver Arte',
                                    categoryId: 'art_design',
                                    color: '#7C3AED',
                                },
                                // ── 18 new specialty slides ────────────────────
                                {
                                    image: '/carousel/c_masaje_portrait.png',
                                    category: t('cat_beautyWellness'),
                                    title: 'Terapia que transforma',
                                    subtitle: 'Masajes relajantes y terapéuticos — a domicilio o en spa',
                                    ctaLabel: 'Ver Masajes',
                                    categoryId: 'beauty_wellness',
                                    color: '#0D9488',
                                },
                                {
                                    image: '/carousel/c_masaje_action.png',
                                    category: t('cat_beautyWellness'),
                                    title: 'Relájate. Lo mereces.',
                                    subtitle: 'Terapeutas certificados disponibles ahora',
                                    ctaLabel: 'Ver Masajes',
                                    categoryId: 'beauty_wellness',
                                    color: '#0D9488',
                                },
                                {
                                    image: '/carousel/c_unas_portrait.png',
                                    category: t('cat_beautyWellness'),
                                    title: 'Uñas de ensueño',
                                    subtitle: 'Nail art, acrílico, gel y más — agenda hoy',
                                    ctaLabel: 'Ver Uñas',
                                    categoryId: 'beauty_wellness',
                                    color: '#EC4899',
                                },
                                {
                                    image: '/carousel/c_unas_action.png',
                                    category: t('cat_beautyWellness'),
                                    title: 'Arte en cada uña',
                                    subtitle: 'Profesionales del nail art cerca de ti',
                                    ctaLabel: 'Ver Uñas',
                                    categoryId: 'beauty_wellness',
                                    color: '#EC4899',
                                },
                                {
                                    image: '/carousel/c_poledance_portrait.png',
                                    category: t('cat_beautyWellness'),
                                    title: 'Fuerza, arte y confianza',
                                    subtitle: 'Clases de pole dance para todos los niveles',
                                    ctaLabel: 'Ver Clases',
                                    categoryId: 'beauty_wellness',
                                    color: '#8B5CF6',
                                },
                                {
                                    image: '/carousel/c_poledance_action.png',
                                    category: t('cat_beautyWellness'),
                                    title: 'Descubre tu potencial',
                                    subtitle: 'Instructoras certificadas — primera clase gratis',
                                    ctaLabel: 'Ver Clases',
                                    categoryId: 'beauty_wellness',
                                    color: '#8B5CF6',
                                },
                                {
                                    image: '/carousel/c_mecanico_portrait.png',
                                    category: t('cat_generalServices'),
                                    title: 'Tu auto en buenas manos',
                                    subtitle: 'Mecánicos confiables — diagnóstico y reparación',
                                    ctaLabel: 'Ver Mecánicos',
                                    categoryId: 'general_services',
                                    color: '#B45309',
                                },
                                {
                                    image: '/carousel/c_mecanico_action.png',
                                    category: t('cat_generalServices'),
                                    title: 'Reparado y listo',
                                    subtitle: 'Taller mecánico — presupuesto sin compromiso',
                                    ctaLabel: 'Ver Mecánicos',
                                    categoryId: 'general_services',
                                    color: '#B45309',
                                },
                                {
                                    image: '/carousel/c_fotografa_portrait.png',
                                    category: t('cat_artDesign'),
                                    title: 'Momentos para siempre',
                                    subtitle: 'Fotógrafas profesionales — bodas, quinces, retratos',
                                    ctaLabel: 'Ver Fotógrafos',
                                    categoryId: 'art_design',
                                    color: '#9333EA',
                                },
                                {
                                    image: '/carousel/c_fotografa_action.png',
                                    category: t('cat_artDesign'),
                                    title: 'Cada foto cuenta una historia',
                                    subtitle: 'Sesiones de fotos profesionales — agenda ahora',
                                    ctaLabel: 'Ver Fotógrafos',
                                    categoryId: 'art_design',
                                    color: '#9333EA',
                                },
                                {
                                    image: '/carousel/c_zapatero_portrait.png',
                                    category: t('cat_generalServices'),
                                    title: 'Artesanos del cuero',
                                    subtitle: 'Reparación y restauración de calzado — hecho a mano',
                                    ctaLabel: 'Ver Zapateros',
                                    categoryId: 'general_services',
                                    color: '#92400E',
                                },
                                {
                                    image: '/carousel/c_zapatero_action.png',
                                    category: t('cat_generalServices'),
                                    title: 'Como nuevos',
                                    subtitle: 'Zapateros expertos — tus zapatos favoritos restaurados',
                                    ctaLabel: 'Ver Zapateros',
                                    categoryId: 'general_services',
                                    color: '#92400E',
                                },
                                {
                                    image: '/carousel/c_pintor_portrait.png',
                                    category: t('cat_generalServices'),
                                    title: 'Tu hogar, a nuevo color',
                                    subtitle: 'Pintores profesionales — interiores y exteriores',
                                    ctaLabel: 'Ver Pintores',
                                    categoryId: 'general_services',
                                    color: '#1D4ED8',
                                },
                                {
                                    image: '/carousel/c_pintor_action.png',
                                    category: t('cat_generalServices'),
                                    title: 'Transformamos espacios',
                                    subtitle: 'Acabados perfectos — pintura y estuco',
                                    ctaLabel: 'Ver Pintores',
                                    categoryId: 'general_services',
                                    color: '#1D4ED8',
                                },
                                {
                                    image: '/carousel/c_estilista_portrait.png',
                                    category: t('cat_beautyWellness'),
                                    title: 'Tu mejor versión',
                                    subtitle: 'Estilistas con experiencia — corte, color y más',
                                    ctaLabel: 'Ver Estilistas',
                                    categoryId: 'beauty_wellness',
                                    color: '#BE185D',
                                },
                                {
                                    image: '/carousel/c_estilista_action.png',
                                    category: t('cat_beautyWellness'),
                                    title: 'El salón te espera',
                                    subtitle: 'Agenda en minutos — estilistas top cerca de ti',
                                    ctaLabel: 'Ver Estilistas',
                                    categoryId: 'beauty_wellness',
                                    color: '#BE185D',
                                },
                                {
                                    image: '/carousel/c_maquillaje_portrait.png',
                                    category: t('cat_beautyWellness'),
                                    title: 'Glamour profesional',
                                    subtitle: 'Maquillistas para eventos, bodas y más',
                                    ctaLabel: 'Ver Maquillaje',
                                    categoryId: 'beauty_wellness',
                                    color: '#D946EF',
                                },
                                {
                                    image: '/carousel/c_maquillaje_action.png',
                                    category: t('cat_beautyWellness'),
                                    title: 'Make up que impresiona',
                                    subtitle: 'Maquillaje personalizado — a domicilio disponible',
                                    ctaLabel: 'Ver Maquillaje',
                                    categoryId: 'beauty_wellness',
                                    color: '#D946EF',
                                },
                                // ── Salud & Medicina slides ─────────────────────
                                {
                                    image: '/carousel/c_dentista_portrait.png',
                                    category: t('cat_healthMedicine'),
                                    title: 'Tu sonrisa, en manos expertas',
                                    subtitle: 'Dentistas y ortodoncistas — agenda hoy',
                                    ctaLabel: 'Ver Odontología',
                                    categoryId: 'health_medicine',
                                    color: '#059669',
                                },
                                {
                                    image: '/carousel/c_dentista_action.png',
                                    category: t('cat_healthMedicine'),
                                    title: 'Brackets, caries, implantes',
                                    subtitle: 'Tratamientos completos — sin listas de espera',
                                    ctaLabel: 'Ver Odontología',
                                    categoryId: 'health_medicine',
                                    color: '#059669',
                                },
                                {
                                    image: '/carousel/c_medico_portrait.png',
                                    category: t('cat_healthMedicine'),
                                    title: 'Tu médico de confianza',
                                    subtitle: 'Médicos generales y especialistas cerca de ti',
                                    ctaLabel: 'Ver Médicos',
                                    categoryId: 'health_medicine',
                                    color: '#059669',
                                },
                                {
                                    image: '/carousel/c_medico_action.png',
                                    category: t('cat_healthMedicine'),
                                    title: 'Consulta hoy, sin filas',
                                    subtitle: 'Atención médica rápida y profesional',
                                    ctaLabel: 'Ver Médicos',
                                    categoryId: 'health_medicine',
                                    color: '#059669',
                                },
                                {
                                    image: '/carousel/c_fisioterapeuta_portrait.png',
                                    category: t('cat_healthMedicine'),
                                    title: 'Recupera tu movimiento',
                                    subtitle: 'Fisioterapeutas certificados — a domicilio o en clínica',
                                    ctaLabel: 'Ver Fisioterapia',
                                    categoryId: 'health_medicine',
                                    color: '#059669',
                                },
                                {
                                    image: '/carousel/c_fisioterapeuta_action.png',
                                    category: t('cat_healthMedicine'),
                                    title: 'Rehabilitación de verdad',
                                    subtitle: 'Tratamiento para espalda, lesiones y más',
                                    ctaLabel: 'Ver Fisioterapia',
                                    categoryId: 'health_medicine',
                                    color: '#059669',
                                },
                                {
                                    image: '/carousel/c_psicologo_portrait.png',
                                    category: t('cat_healthMedicine'),
                                    title: 'Tu bienestar importa',
                                    subtitle: 'Psicólogos y terapeutas — sesiones confidenciales',
                                    ctaLabel: 'Ver Psicología',
                                    categoryId: 'health_medicine',
                                    color: '#059669',
                                },
                                {
                                    image: '/carousel/c_pediatra_action.png',
                                    category: t('cat_healthMedicine'),
                                    title: 'Cuidado pediátrico experto',
                                    subtitle: 'Pediatras que los niños adoran — vacunas y control',
                                    ctaLabel: 'Ver Pediatría',
                                    categoryId: 'health_medicine',
                                    color: '#059669',
                                },
                                {
                                    image: '/carousel/c_oftalmologo_portrait.png',
                                    category: t('cat_healthMedicine'),
                                    title: 'Ve el mundo con claridad',
                                    subtitle: 'Oftalmólogos y optometristas — examen de vista hoy',
                                    ctaLabel: 'Ver Oftalmología',
                                    categoryId: 'health_medicine',
                                    color: '#059669',
                                },
                                {
                                    image: '/carousel/c_oftalmologo_action.png',
                                    category: t('cat_healthMedicine'),
                                    title: 'Lentes, LASIK y mucho más',
                                    subtitle: 'Cuidado visual completo — sin esperar meses',
                                    ctaLabel: 'Ver Oftalmología',
                                    categoryId: 'health_medicine',
                                    color: '#059669',
                                },
                                {
                                    image: '/carousel/c_ginecologa_portrait.png',
                                    category: t('cat_healthMedicine'),
                                    title: 'Tu salud femenina, primero',
                                    subtitle: 'Ginecólogas preparadas — consulta y prenatal',
                                    ctaLabel: 'Ver Ginecología',
                                    categoryId: 'health_medicine',
                                    color: '#059669',
                                },
                                {
                                    image: '/carousel/c_ginecologa_action.png',
                                    category: t('cat_healthMedicine'),
                                    title: 'Ultrasonido y control prenatal',
                                    subtitle: 'Acompaña tu embarazo con las mejores manos',
                                    ctaLabel: 'Ver Ginecología',
                                    categoryId: 'health_medicine',
                                    color: '#059669',
                                },
                                {
                                    image: '/carousel/c_nutricionista_portrait.png',
                                    category: t('cat_healthMedicine'),
                                    title: 'Aliméntate bien, vive mejor',
                                    subtitle: 'Nutricionistas con plan personalizado para ti',
                                    ctaLabel: 'Ver Nutrición',
                                    categoryId: 'health_medicine',
                                    color: '#059669',
                                },
                                {
                                    image: '/carousel/c_nutricionista_action.png',
                                    category: t('cat_healthMedicine'),
                                    title: 'Tu plato saludable diseñado',
                                    subtitle: 'Consulta nutricional — pérdida de peso y más',
                                    ctaLabel: 'Ver Nutrición',
                                    categoryId: 'health_medicine',
                                    color: '#059669',
                                },
                            ]}
                            onCategoryClick={(catId) => setSelectedCategory(catId)}
                        />
                    </div>

                    {/* Featured Pros List (Scrollable Fill) */}
                    <div
                        ref={listRef}
                        className="flex-1 overflow-y-auto px-3 sm:px-6 pb-24 space-y-3 custom-scrollbar"
                        style={{ overscrollBehaviorY: 'contain' }}
                        onTouchStart={(e) => {
                            if (listRef.current?.scrollTop === 0 && !isRefreshing) {
                                ptrStartY.current = e.touches[0].clientY;
                            }
                        }}
                        onTouchMove={(e) => {
                            if (ptrStartY.current === null) return;
                            const dy = e.touches[0].clientY - ptrStartY.current;
                            if (dy > 0) setPtrDistance(Math.min(dy * 0.45, PTR_THRESHOLD + 25));
                        }}
                        onTouchEnd={() => {
                            if (ptrDistance >= PTR_THRESHOLD && !isRefreshing) {
                                setIsRefreshing(true);
                                setPtrDistance(0);
                                ptrStartY.current = null;
                                setTimeout(() => window.location.reload(), 600);
                            } else {
                                setPtrDistance(0);
                                ptrStartY.current = null;
                            }
                        }}
                    >
                        {/* Pull-to-refresh indicator */}
                        {(ptrDistance > 5 || isRefreshing) && (
                            <div
                                className="flex items-center justify-center overflow-hidden transition-all duration-150"
                                style={{ height: isRefreshing ? 48 : ptrDistance }}
                            >
                                <div className={`w-7 h-7 rounded-full border-[3px] border-[#14B8A6] border-t-transparent ${(ptrDistance >= PTR_THRESHOLD || isRefreshing) ? 'animate-spin' : ''}`} />
                            </div>
                        )}
                        {filteredBusinesses.map((biz) => {
                            // Category theme color
                            const catColor =
                                biz.category === 'beauty_wellness' ? { border: '#DB2777', bg: '#FDF2F8', avatar: '#FCE7F3', text: '#9D174D' } :
                                    biz.category === 'art_design' ? { border: '#7C3AED', bg: '#F5F3FF', avatar: '#EDE9FE', text: '#5B21B6' } :
                                        biz.category === 'general_services' ? { border: '#2563EB', bg: '#EFF6FF', avatar: '#DBEAFE', text: '#1E40AF' } :
                                            biz.category === 'health_medicine' ? { border: '#059669', bg: '#ECFDF5', avatar: '#D1FAE5', text: '#065F46' } :
                                                { border: '#14B8A6', bg: '#F0FDFA', avatar: '#CCFBF1', text: '#0F766E' };

                            const isRevealed = revealedCardId === biz.id;

                            return (
                                <div
                                    key={biz.id}
                                    onClick={() => {
                                        // On mobile (md breakpoint is 768px), first tap reveals text, second tap navigates
                                        if (typeof window !== 'undefined' && window.innerWidth < 768) {
                                            if (revealedCardId !== biz.id) {
                                                setRevealedCardId(biz.id);
                                                setSelectedBusiness(biz);
                                                return;
                                            }
                                        }
                                        // On desktop, or if already revealed on mobile, navigate immediately
                                        handleBusinessClick(biz);
                                    }}
                                    style={{ backgroundColor: catColor.bg }}
                                    className={`flex items-center p-3 border rounded-2xl transition-all cursor-pointer group overflow-hidden relative
                                ${selectedBusiness?.id === biz.id ? 'border-[#14B8A6] shadow-[0_0_0_2px_rgba(20,184,166,0.15)]' : 'border-[#E6E8EC] hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)]'}
                            `}
                                >
                                    {/* Colored left accent bar */}
                                    <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl" style={{ backgroundColor: catColor.border }} />
                                    <div className="w-10 h-10 rounded-xl mr-3 ml-2 shrink-0 flex items-center justify-center text-lg relative overflow-hidden" style={{ backgroundColor: catColor.avatar }}>
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
                                        <div className="flex items-center gap-1.5">
                                            {((biz as any).reviewCount || 0) > 0 ? (
                                                <>
                                                    <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                                                    <span className="text-yellow-400 font-bold text-[10px]">{((biz as any).rating ?? 0).toFixed(1)}</span>
                                                </>
                                            ) : (
                                                <span className="text-[#0F766E] font-bold text-[10px] px-1.5 py-0.5 bg-[rgba(20,184,166,0.1)] rounded px-1">Nuevo</span>
                                            )}
                                            {userCoords && (() => {
                                                const bizLat = (biz as any).location?.lat ?? biz.lat;
                                                const bizLng = (biz as any).location?.lng ?? biz.lng;
                                                if (bizLat == null) return null;
                                                const dist = haversineKm(userCoords.lat, userCoords.lng, bizLat, bizLng);
                                                return (
                                                    <span className="flex items-center gap-0.5 text-[10px] text-teal-600 font-semibold">
                                                        <Navigation className="w-2.5 h-2.5" />
                                                        {formatDistance(dist)}
                                                    </span>
                                                );
                                            })()}
                                            {!userCoords && <span className="text-slate-500 text-[10px] truncate">({(biz as any).city || (biz as any).location?.city || 'Pro24/7'})</span>}
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-1.5 ml-2 shrink-0">
                                        {/* Desktop 'Ver' button */}
                                        <div className="hidden md:flex items-center px-2 py-1 bg-[rgba(20,184,166,0.10)] rounded-full text-[10px] text-[#0F766E] font-semibold whitespace-nowrap border border-[#14B8A6]/20">
                                            {t('viewBtn')}
                                        </div>
                                        {/* Mobile reveal logic - Requires double tap */}
                                        <div
                                            className={`flex md:hidden items-center text-[10px] font-bold whitespace-nowrap transition-opacity duration-300 ${isRevealed ? 'opacity-100 block' : 'opacity-0 hidden'} text-[#0F766E]`}
                                        >
                                            ver perfil
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
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
                                        <div key={sub.id} className="bg-white rounded-2xl p-4 border-2 border-slate-100 hover:border-slate-200 transition-colors shadow-sm">
                                            <h3 className="text-base font-black text-[#1E3A8A] mb-3 flex items-center gap-2">
                                                <span className="w-2 h-2 rounded-full bg-[#2563EB]"></span>
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
                                                        className="flex items-center gap-1.5 bg-slate-50 border-2 border-slate-200 shadow-sm rounded-xl px-3 py-2 text-[13px] font-bold text-slate-800 hover:bg-[rgba(20,184,166,0.08)] hover:border-[#14B8A6]/60 hover:text-[#0F766E] cursor-pointer transition-all group/item active:scale-95"
                                                    >
                                                        <ChevronRight className="w-3 h-3 text-slate-400 group-hover/item:text-[#14B8A6] shrink-0 transition-colors" />
                                                        <span className="font-bold">{(spec as any)[localeKey] ?? (spec as any).es}</span>
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
                                    {t('filters.title')}
                                </h3>
                                {activeFilterCount > 0 && (
                                    <button
                                        onClick={() => { setFilterCategory(null); setFilterRating(0); setFilterHasSchedule(false); setFilterMaxKm(0); }}
                                        className="text-xs text-red-500 font-semibold hover:text-red-600 transition-colors"
                                    >
                                        {t('filters.remove')}
                                    </button>
                                )}
                            </div>

                            {/* Section: Categoría */}
                            <div className="mb-5">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{t('filters.category')}</p>
                                <div className="flex flex-wrap gap-2">
                                    {[{ id: null, label: t('filters.allCategories') }, { id: 'general_services', label: `🛠️ ${t('cat_generalServices')}` }, { id: 'beauty_wellness', label: `💇 ${t('cat_beautyWellness')}` }, { id: 'art_design', label: `🎨 ${t('cat_artDesign')}` }].map(opt => (
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
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{t('filters.minRating')}</p>
                                <div className="flex gap-2">
                                    {[{ val: 0, label: t('filters.anyRating') }, { val: 4, label: '4+ ⭐' }, { val: 5, label: '5.0 ⭐' }].map(opt => (
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

                            {/* Section: Distancia */}
                            <div className="mb-5">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{t('filters.distance')}</p>

                                {/* Request location button */}
                                {!userCoords ? (
                                    <button
                                        onClick={requestLocation}
                                        disabled={geoLoading}
                                        className="flex items-center gap-2 w-full px-4 py-3 rounded-2xl border border-dashed border-teal-400 bg-teal-50 text-teal-700 text-sm font-semibold hover:bg-teal-100 transition-all disabled:opacity-60 mb-2"
                                    >
                                        <Navigation className="w-4 h-4 shrink-0" />
                                        {geoLoading ? t('filters.gettingLocation') : `📍 ${t('filters.useLocation')}`}
                                    </button>
                                ) : (
                                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 text-xs font-semibold mb-2">
                                        <Navigation className="w-3.5 h-3.5" />
                                        {t('filters.locationActive')} ✅
                                        <button onClick={() => { setUserCoords(null); setFilterMaxKm(0); }} className="ml-auto text-red-400 hover:text-red-600 text-xs">{t('filters.remove')}</button>
                                    </div>
                                )}

                                {geoError && <p className="text-xs text-red-500 mb-2">{geoError}</p>}

                                {/* Distance options */}
                                <div className="flex flex-wrap gap-2">
                                    {[{ val: 0, label: t('filters.noLimit') }, { val: 5, label: '5 km' }, { val: 10, label: '10 km' }, { val: 25, label: '25 km' }, { val: 50, label: '50 km' }].map(opt => (
                                        <button
                                            key={opt.val}
                                            disabled={!userCoords && opt.val > 0}
                                            onClick={() => setFilterMaxKm(opt.val)}
                                            className={`px-4 py-2 rounded-full text-sm font-semibold border transition-all disabled:opacity-40 disabled:cursor-not-allowed ${filterMaxKm === opt.val
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
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{t('filters.options')}</p>
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
                                    📅 {t('filters.onlyWithSchedule')}
                                </button>
                            </div>

                            {/* Apply Button */}
                            <button
                                onClick={() => setShowFilters(false)}
                                className="w-full py-3.5 rounded-2xl bg-[#14B8A6] hover:bg-[#0F9488] text-white font-bold text-sm shadow-[0_4px_14px_rgba(20,184,166,0.30)] transition-all"
                            >
                                {activeFilterCount > 0 ? (activeFilterCount > 1 ? t('filters.applyPlural', { count: activeFilterCount }) : t('filters.applySingular', { count: activeFilterCount })) : t('filters.close')}
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
