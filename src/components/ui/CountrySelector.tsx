import React, { useState } from 'react';
import { useCountry } from '@/context/CountryContext';
import { COUNTRIES, CountryCode } from '@/lib/locations';
import { Search, Globe, ChevronRight, Sparkles } from 'lucide-react';

export default function CountrySelector() {
    const { selectCountry } = useCountry();
    const [searchTerm, setSearchTerm] = useState('');

    const PRIORITY_ORDER: CountryCode[] = [
        'MX', 'HN', 'US', 'ES',
        'CO', 'AR', 'CL', 'PE'
    ];

    const allCountries = PRIORITY_ORDER
        .map(code => COUNTRIES[code])
        .filter(Boolean)
        .concat(
            Object.values(COUNTRIES)
                .filter(c => !PRIORITY_ORDER.includes(c.code))
        );

    const uniqueCountries = Array.from(new Set(allCountries));

    const filteredCountries = uniqueCountries.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.code.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* 1. Cinematic Backdrop */}
            <div className="absolute inset-0 bg-[#050b14]/95 backdrop-blur-xl transition-all duration-700"></div>

            {/* 2. Ambient Light Orbs - Subtle and Deep */}
            <div className="absolute top-[-20%] left-[-20%] w-[800px] h-[800px] bg-brand-primary/10 rounded-full blur-[150px] animate-pulse"></div>
            <div className="absolute bottom-[-20%] right-[-20%] w-[800px] h-[800px] bg-brand-neon-purple/10 rounded-full blur-[150px] animate-pulse delay-700"></div>

            {/* 3. Main Container */}
            <div className="relative w-full max-w-6xl h-[90vh] md:h-[85vh] bg-[#0f172a]/40 border border-white/5 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-500 backdrop-blur-2xl">

                {/* Decorative Elements */}
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-brand-neon-cyan/30 to-transparent opacity-50"></div>

                {/* Header Section */}
                <div className="relative shrink-0 p-8 md:p-10 pb-4 text-center z-10">
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white mb-2 tracking-tight drop-shadow-lg">
                        Bienvenido
                    </h1>
                    <p className="text-slate-400 text-lg md:text-xl font-medium max-w-2xl mx-auto leading-relaxed">
                        Selecciona tu país para comenzar
                    </p>
                </div>

                {/* Search & Filter */}
                <div className="shrink-0 px-6 md:px-12 py-6 z-10 w-full max-w-2xl mx-auto">
                    <div className="relative group">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-brand-neon-cyan to-brand-accent rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
                        <div className="relative bg-[#1a2f4e] rounded-2xl flex items-center px-6 h-16 shadow-lg border border-white/5">
                            <Search className="w-6 h-6 text-slate-400 mr-4 group-focus-within:text-brand-neon-cyan transition-colors" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Buscar país (México, Honduras, USA...)"
                                className="bg-transparent border-none outline-none text-white text-lg w-full placeholder:text-slate-600 font-medium"
                                autoFocus
                            />
                        </div>
                    </div>
                </div>

                {/* Countries Grid */}
                <div className="flex-1 overflow-y-auto px-6 md:px-12 pb-12 pt-4 z-10 custom-scrollbar">

                    {filteredCountries.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-48 text-slate-500">
                            <Globe className="w-12 h-12 mb-4 opacity-20" />
                            <p className="text-lg">No encontramos resultados para "{searchTerm}"</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
                            {filteredCountries.map((country) => {
                                const isPriority = PRIORITY_ORDER.includes(country.code) && !searchTerm;
                                return (
                                    <button
                                        key={country.code}
                                        onClick={() => selectCountry(country.code)}
                                        className={`
                                            group relative flex flex-col items-center justify-center p-6 rounded-3xl transition-all duration-300
                                            bg-[#1e293b]/40 border border-white/5 shadow-lg
                                            hover:bg-[#1e293b]/80 hover:border-brand-neon-cyan/50 hover:shadow-[0_0_30px_rgba(0,240,255,0.15)]
                                            hover:-translate-y-1
                                        `}
                                    >
                                        {/* Waving Flag Image */}
                                        <div className="relative w-24 h-16 mb-4 filter drop-shadow-2xl transition-transform duration-300 group-hover:scale-110 group-hover:rotate-2">
                                            <img
                                                src={`https://flagcdn.com/w160/${country.code.toLowerCase()}.png`}
                                                alt={`Bandera de ${country.name}`}
                                                className="w-full h-full object-contain"
                                                loading="lazy"
                                                onError={(e) => {
                                                    // Fallback to emoji if image fails
                                                    (e.target as HTMLImageElement).style.display = 'none';
                                                    (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                                                }}
                                            />
                                            {/* Fallback Emoji */}
                                            <span className="hidden text-6xl absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">{country.flag}</span>
                                        </div>

                                        {/* Country Name */}
                                        <h3 className="text-white font-bold text-lg md:text-xl text-center group-hover:text-brand-neon-cyan transition-colors">
                                            {country.name}
                                        </h3>

                                        {/* Priority Badge (Subtle) */}
                                        {isPriority && (
                                            <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-brand-neon-cyan/50 shadow-[0_0_10px_rgba(0,240,255,0.8)]"></div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
