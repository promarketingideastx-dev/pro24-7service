'use client';

import { useState } from 'react';
import { Search, MapPin, Star, Bell, Filter, Grid, Zap, User, X, ChevronRight } from 'lucide-react';
import { DEMO_BUSINESSES } from '@/data/mockBusinesses';
import { TAXONOMY } from '@/lib/taxonomy';
import dynamic from 'next/dynamic';

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

    // Derived State
    const filteredBusinesses = DEMO_BUSINESSES.filter(b =>
        b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.subcategory.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleCategoryClick = (id: string) => {
        setSelectedCategory(id);
    };

    const selectedTaxonomy = selectedCategory ? TAXONOMY[selectedCategory as keyof typeof TAXONOMY] : null;

    return (
        <main className="min-h-screen bg-[#0B0F19] text-white overflow-x-hidden pb-10 font-sans">

            {/* Header (Minimal) */}
            <header className="px-6 py-6 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-400 to-blue-500 flex items-center justify-center shadow-[0_0_15px_rgba(0,240,255,0.3)]">
                        <span className="font-bold text-xs text-black">P24</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] text-slate-400 font-medium tracking-wider uppercase leading-none">Ubicación</span>
                        <div className="flex items-center gap-1 cursor-pointer group">
                            <span className="font-bold text-sm text-white group-hover:text-brand-neon-cyan transition-colors">San Pedro Sula</span>
                            <MapPin className="w-3 h-3 text-brand-neon-cyan" />
                        </div>
                    </div>
                </div>
                <div className="w-10 h-10 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center">
                    <User className="w-5 h-5 text-slate-400" />
                </div>
            </header>

            <div className="px-6 space-y-8">

                {/* Search Bar - Large & Glow */}
                <div className="relative group">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-purple-600 opacity-20 rounded-2xl blur-md group-hover:opacity-40 transition duration-500"></div>
                    <div className="relative flex items-center bg-[#151b2e] border border-white/10 rounded-2xl px-5 py-4 shadow-2xl">
                        <Search className="w-6 h-6 text-slate-400 mr-3" />
                        <input
                            type="text"
                            placeholder="Buscar: 'Plomero', 'Zapatos'..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-transparent w-full outline-none text-white placeholder-slate-500 text-lg font-medium"
                        />
                    </div>
                </div>

                {/* Categories Row (Horizontal) */}
                <div className="flex justify-between items-start gap-2 overflow-x-auto no-scrollbar py-2">
                    {categories.map((cat, idx) => (
                        <div
                            key={idx}
                            onClick={() => handleCategoryClick(cat.id)}
                            className="flex flex-col items-center gap-2 min-w-[100px] cursor-pointer group"
                        >
                            <div className={`
                 w-16 h-16 rounded-2xl flex items-center justify-center text-2xl
                 ${cat.bg} border ${cat.border}
                 shadow-[0_0_15px_rgba(0,0,0,0.2)]
                 group-hover:scale-105 transition-transform duration-300
               `}>
                                <span className="filter drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]">{cat.icon}</span>
                            </div>
                            <span className="text-xs font-medium text-slate-400 group-hover:text-white transition-colors">{cat.name}</span>
                        </div>
                    ))}
                </div>

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
                                                <div key={i} className="flex items-center gap-2 text-sm text-slate-300 bg-white/5 px-3 py-2 rounded-lg hover:bg-white/10 cursor-pointer transition-colors group/item">
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

                {/* Map Widget (Real Leaflet Map) */}
                <div className="relative h-[400px] w-full rounded-3xl overflow-hidden border border-white/10 shadow-2xl group cursor-pointer isolate">
                    <DynamicMap businesses={filteredBusinesses} />

                    {/* Map Label (Overlay) */}
                    <div className="absolute bottom-4 left-4 z-[1000] pointer-events-none">
                        <div className="bg-[#0B0F19]/80 backdrop-blur px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-2">
                            <MapPin className="w-3 h-3 text-cyan-400" />
                            <span className="text-xs font-bold text-white">San Pedro Sula (En Vivo)</span>
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                        </div>
                    </div>
                </div>

                {/* Featured Pros List (Uses Filtered Data if matches, else defaults) */}
                <div className="space-y-4">
                    {(filteredBusinesses.length > 0 ? filteredBusinesses : DEMO_BUSINESSES).slice(0, 3).map((biz) => (
                        <div key={biz.id} className="flex items-center p-4 bg-[#151b2e] border border-white/5 rounded-3xl hover:border-white/10 transition-all cursor-pointer group">
                            <div className="w-14 h-14 rounded-2xl bg-slate-700 mr-4 shrink-0 flex items-center justify-center text-2xl relative overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-white/0"></div>
                                {typeof biz.icon === 'string' ? biz.icon : <Zap className="w-6 h-6 text-white" />}
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-white text-base">{biz.name}</h3>
                                <p className="text-xs text-brand-neon-cyan font-medium mb-1">{biz.subcategory}</p>
                                <div className="flex items-center gap-1">
                                    <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                                    <span className="text-yellow-400 font-bold text-xs">5.0</span>
                                    <span className="text-slate-500 text-xs">(San Pedro Sula)</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

            </div>
        </main>
    );
}
