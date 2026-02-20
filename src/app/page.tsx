'use client';

import { useState, useEffect } from 'react';
import { Search, MapPin, Star, Bell, Filter, Grid, Zap, User, X, ChevronRight, Store } from 'lucide-react';
import { DEMO_BUSINESSES, BusinessMock } from '@/data/mockBusinesses';
import { TAXONOMY } from '@/lib/taxonomy';
import { matchesSearch, findSuggestion } from '@/lib/searchUtils';
import { useCountry } from '@/context/CountryContext';
import CountrySelector from '@/components/ui/CountrySelector';
import dynamic from 'next/dynamic';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
// import AuthGateModal from '@/components/ui/AuthGateModal'; // Kept for reference but unused
import PublicBusinessPreviewModal from '@/components/ui/PublicBusinessPreviewModal';

const DynamicMap = dynamic(() => import('@/components/ui/MapWidget'), {
    ssr: false,
    loading: () => <div className="h-full w-full bg-slate-900 animate-pulse rounded-3xl flex items-center justify-center text-slate-500">Cargando Mapa...</div>
});

export default function Home() {
    // Categories with Layout Styling & Taxonomy IDs
    const categories = [
        { id: 'general_services', name: 'Servicios Generales', icon: '🛠️', color: 'text-blue-400', border: 'border-blue-500/30', bg: 'bg-blue-500/10' },
        { id: 'beauty_wellness', name: 'Belleza / Cuidado', icon: '💇‍♀️', color: 'text-pink-400', border: 'border-pink-500/30', bg: 'bg-pink-500/10' },
        { id: 'art_design', name: 'Arte y Diseño', icon: '🎨', color: 'text-purple-400', border: 'border-purple-500/30', bg: 'bg-purple-500/10' },
    ];

    /* State for simple filtering */
    const [searchTerm, setSearchTerm] = useState('');
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
            router.push(`/negocio/${biz.id}`);
        }
    };

    const handleBusinessClick = (biz: BusinessMock) => {
        // Double-click logic: 
        // 1st click = Select & Preview (handled by state + map flyTo)
        // 2nd click (on same) = Navigate
        if (selectedBusiness?.id === biz.id) {
            handleNavigate(biz);
        } else {
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

        // 1. Prepare Searchable Text (Name, Category, Subcategory, Tags, Desc)
        const searchableText = `
            ${b.name} 
            ${b.category} 
            ${b.subcategory} 
            ${b.tags.join(' ')} 
            ${b.description || ''}
        `;

        // 2. Use Advanced Token Matching
        return matchesSearch(searchableText, term);
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
    if (isCountryLoading) return <div className="h-screen bg-[#0B0F19] flex items-center justify-center text-white">Cargando...</div>;
    if (!selectedCountry) return <CountrySelector />;

    return (
        <main className="h-screen bg-[#0B0F19] text-white overflow-hidden font-sans flex flex-col">
            {/* Header with Dynamic Location */}
            <header className="shrink-0 px-6 py-4 flex justify-between items-center z-50 bg-[#0B0F19]">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-400 to-blue-500 flex items-center justify-center shadow-[0_0_15px_rgba(0,240,255,0.3)]">
                        <span className="font-bold text-xs text-black">P24</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] text-brand-neon-cyan/80 font-bold tracking-wider uppercase leading-none mb-0.5">Ubicación</span>
                        <div
                            className="flex items-center gap-2 cursor-pointer group bg-white/5 hover:bg-white/10 px-2.5 py-1.5 rounded-lg transition-colors border border-transparent hover:border-white/10"
                            onClick={clearCountry}
                        >
                            {/* Waving Flag Icon */}
                            <div className="w-6 h-4 relative shadow-sm rounded-sm overflow-hidden">
                                <img
                                    src={`https://flagcdn.com/w40/${selectedCountry.code.toLowerCase()}.png`}
                                    alt={selectedCountry.name}
                                    className="w-full h-full object-cover"
                                />
                            </div>

                            <span className="font-bold text-sm text-white group-hover:text-brand-neon-cyan transition-colors">
                                {selectedCountry.name}
                            </span>
                            <MapPin className="w-3 h-3 text-slate-400 group-hover:text-brand-neon-cyan transition-colors" />
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {user ? (
                        <div className="flex items-center gap-3 group relative">
                            {/* Business Owner Switch */}
                            {userProfile?.roles?.provider && (
                                <button
                                    onClick={() => router.push('/business/dashboard')}
                                    className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border border-brand-neon-cyan/30 bg-brand-neon-cyan/10 text-brand-neon-cyan text-xs font-bold hover:bg-brand-neon-cyan/20 transition-all"
                                >
                                    <Store className="w-3 h-3" />
                                    Administrar mi Negocio
                                </button>
                            )}

                            {/* User Info (Desktop/Tablet) */}
                            <div className="hidden sm:flex flex-col items-end">
                                <span className="text-xs font-bold text-white leading-none">{user.displayName || 'Usuario'}</span>
                                <span className="text-[10px] text-slate-400">Ver Perfil</span>
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
                            <div className="absolute top-12 right-0 w-48 bg-[#151b2e] border border-white/10 rounded-xl shadow-2xl p-2 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all z-50">
                                <div className="px-3 py-2 border-b border-white/5 mb-1">
                                    <p className="text-xs text-slate-400">Conectado como</p>
                                    <p className="text-sm text-white font-medium truncate">{user.email}</p>
                                </div>

                                {userProfile?.roles?.provider && (
                                    <button
                                        onClick={() => router.push('/business/dashboard')}
                                        className="w-full text-left px-3 py-2 rounded-lg text-brand-neon-cyan hover:bg-white/5 text-sm font-medium transition-colors flex items-center gap-2 mb-1"
                                    >
                                        <Store size={14} />
                                        Administrar Negocio
                                    </button>
                                )}

                                <button
                                    onClick={() => router.push('/user/profile')}
                                    className="w-full text-left px-3 py-2 rounded-lg text-slate-300 hover:bg-white/5 text-sm font-medium transition-colors flex items-center gap-2 mb-1"
                                >
                                    <User size={14} />
                                    Mi Perfil
                                </button>

                                <button
                                    onClick={() => {
                                        import('@/services/auth.service').then(({ AuthService }) => {
                                            AuthService.logout().then(() => {
                                                window.location.reload(); // Force refresh to clear state nicely
                                            });
                                        });
                                    }}
                                    className="w-full text-left px-3 py-2 rounded-lg text-slate-300 hover:bg-white/5 text-sm font-medium transition-colors flex items-center gap-2 mb-1"
                                >
                                    <span className="w-2 h-2 rounded-full bg-slate-500"></span>
                                    Cerrar Sesión
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-4">
                            {/* Business CTA - Keep this for professionals */}
                            <button
                                onClick={() => router.push('/onboarding')} // Direct to choice screen
                                className="hidden md:block text-xs font-bold text-slate-400 hover:text-white transition-colors"
                            >
                                ¿Eres profesional? <span className="text-brand-neon-cyan">Regístrate</span>
                            </button>

                            <div className="h-4 w-px bg-white/10 hidden md:block"></div>

                            <button
                                onClick={() => router.push('/auth/login')}
                                className="text-sm font-medium text-slate-300 hover:text-white transition-colors"
                            >
                                Entrar
                            </button>
                            {/* White Button - Only visible when NOT logged in */}
                            <button
                                onClick={() => router.push('/onboarding')}
                                className="bg-white text-slate-900 px-4 py-2 rounded-full text-sm font-bold hover:bg-slate-100 transition-colors"
                            >
                                Crear Cuenta
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
                        <div className="relative flex items-center bg-[#151b2e] border border-white/10 rounded-2xl px-5 py-3 shadow-2xl">
                            <Search className="w-6 h-6 text-slate-400 mr-3" />
                            <input
                                type="text"
                                placeholder="Buscar: 'Fugas', 'Uñas', 'Mecánico'..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="bg-transparent w-full outline-none text-white placeholder-slate-500 text-base font-medium"
                            />
                            {searchTerm && (
                                <button onClick={() => setSearchTerm('')} className="p-1 rounded-full hover:bg-white/10 transition-colors">
                                    <X className="w-5 h-5 text-slate-400" />
                                </button>
                            )}
                        </div>
                    </div>
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
                                <span className="text-xs sm:text-sm font-semibold text-slate-300 group-hover:text-white transition-colors text-center leading-tight">{cat.name}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Map Widget (Responsive Height) */}
                <div className="shrink-0 mx-6 mb-4 rounded-3xl overflow-hidden border border-white/10 shadow-2xl group cursor-pointer isolate relative transition-all duration-300 h-[35vh] min-h-[250px] max-h-[400px] md:h-[400px]">
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
                        <div className="bg-[#0B0F19]/80 backdrop-blur px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-2">
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
                            className={`flex items-center p-3 bg-[#151b2e] border rounded-2xl transition-all cursor-pointer group
                                ${selectedBusiness?.id === biz.id ? 'border-brand-neon-cyan shadow-[0_0_15px_rgba(0,240,255,0.2)]' : 'border-white/5 hover:border-white/10'}
                            `}
                        >
                            <div className="w-12 h-12 rounded-xl bg-slate-700 mr-3 shrink-0 flex items-center justify-center text-xl relative overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-white/0"></div>
                                {typeof biz.icon === 'string' ? biz.icon : <Zap className="w-5 h-5 text-white" />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-white text-sm truncate">{biz.name}</h3>
                                <p className="text-[10px] text-brand-neon-cyan font-medium mb-0.5 truncate">{biz.subcategory}</p>
                                <div className="flex items-center gap-1">
                                    <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                                    <span className="text-yellow-400 font-bold text-[10px]">5.0</span>
                                    <span className="text-slate-500 text-[10px] truncate">(San Pedro Sula)</span>
                                </div>
                            </div>
                            {/* Action hint for logged out users */}
                            <div className="hidden group-hover:flex items-center px-2 py-1 bg-white/10 rounded-full text-[10px] text-white font-medium whitespace-nowrap">
                                Ver
                            </div>
                        </div>
                    ))}
                    {filteredBusinesses.length === 0 && searchTerm && (
                        <div className="flex flex-col items-center justify-center py-10 text-slate-500 text-sm animate-in fade-in zoom-in duration-300">
                            <p>No encontramos resultados para "{searchTerm}"</p>

                            {/* Suggestion UI */}
                            {suggestion && (
                                <div className="mt-4 flex flex-col items-center gap-2">
                                    <p className="text-xs text-slate-400">¿Quizás quisiste decir?</p>
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
                    <div className="fixed inset-0 z-[2000] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                        <div className="bg-[#151b2e] w-full max-w-lg rounded-3xl border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in slide-in-from-bottom duration-300">

                            {/* Header */}
                            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#0f172a]">
                                <div>
                                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                        {categories.find(c => c.id === selectedCategory)?.icon}
                                        {selectedTaxonomy.label.es}
                                    </h2>
                                    <p className="text-xs text-slate-400 mt-1">Explora servicios y especialidades</p>
                                </div>
                                <button
                                    onClick={() => setSelectedCategory(null)}
                                    className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Scrollable Content */}
                            <div className="overflow-y-auto p-4 space-y-4 custom-scrollbar">
                                {selectedTaxonomy.subcategories.map((sub) => (
                                    <div key={sub.id} className="bg-slate-900/50 rounded-2xl p-4 border border-white/5 hover:border-white/10 transition-colors">
                                        <h3 className="font-bold text-brand-neon-cyan mb-3 flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-brand-neon-cyan"></span>
                                            {sub.label.es}
                                        </h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {sub.specialties.map((spec, i) => (
                                                <div
                                                    key={i}
                                                    onClick={() => {
                                                        setSearchTerm(spec);
                                                        setSelectedCategory(null);
                                                    }}
                                                    className="flex items-center gap-2 text-sm text-slate-300 bg-white/5 px-3 py-2 rounded-lg hover:bg-white/10 cursor-pointer transition-colors group/item"
                                                >
                                                    <ChevronRight className="w-3 h-3 text-slate-600 group-hover/item:text-brand-neon-cyan" />
                                                    {spec}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Footer */}
                            <div className="p-4 border-t border-white/5 bg-[#0f172a]">
                                <button
                                    onClick={() => setSelectedCategory(null)}
                                    className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold text-sm hover:opacity-90 transition-opacity"
                                >
                                    Cerrar Explorador
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </main>
    );
}
