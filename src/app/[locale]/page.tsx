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

                    {/* Row 2: Search bar — white card floating on teal */}
                    <div className="flex items-center bg-white rounded-2xl px-5 py-3.5 shadow-md">
                        <Search className="w-5 h-5 text-slate-400 mr-3 shrink-0" />
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
                                        <span>{cat.icon}</span>
                                    </div>
                                    <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900 transition-colors text-center leading-tight">{cat.name}</span>
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
                                            <h3 className="text-base font-bold text-[#2563EB] mb-3 flex items-center gap-2">
                                                <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB]"></span>
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
                                                        className="flex items-center gap-2 text-[15px] text-slate-600 bg-[#F8FAFC] px-3 py-2.5 rounded-lg hover:bg-[rgba(20,184,166,0.08)] hover:text-[#0F766E] cursor-pointer transition-colors group/item border border-transparent hover:border-[#14B8A6]/20"
                                                    >
                                                        <ChevronRight className="w-3 h-3 text-slate-400 group-hover/item:text-[#14B8A6]" />
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
                                        className="w-full py-3 rounded-xl bg-[#14B8A6] hover:bg-[#0F9488] text-white font-bold text-sm shadow-[0_4px_14px_rgba(20,184,166,0.30)] hover:shadow-[0_6px_20px_rgba(20,184,166,0.45)] transition-all"
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
