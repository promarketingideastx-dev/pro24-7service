'use client';

import React, { useState, useEffect } from 'react';
import { useCountry } from '@/context/CountryContext';
import { COUNTRIES, CountryCode } from '@/lib/locations';
import { Search, Globe, X, MapPin } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';

const LOCALES = [
    { code: 'es', label: 'ES', flag: '🇪🇸' },
    { code: 'en', label: 'EN', flag: '🇺🇸' },
    { code: 'pt-BR', label: 'PT', flag: '🇧🇷' },
] as const;

// Country name translations for non-spanish locales
const COUNTRY_NAMES_EN: Record<string, string> = {
    'MX': 'Mexico', 'HN': 'Honduras', 'GT': 'Guatemala', 'SV': 'El Salvador',
    'NI': 'Nicaragua', 'CR': 'Costa Rica', 'PA': 'Panama', 'CO': 'Colombia',
    'VE': 'Venezuela', 'EC': 'Ecuador', 'PE': 'Peru', 'BO': 'Bolivia',
    'PY': 'Paraguay', 'UY': 'Uruguay', 'AR': 'Argentina', 'BR': 'Brazil',
    'CL': 'Chile', 'DO': 'Dominican Republic', 'CU': 'Cuba', 'PR': 'Puerto Rico',
    'ES': 'Spain', 'US': 'United States', 'CA': 'Canada',
};

const COUNTRY_NAMES_PT: Record<string, string> = {
    'MX': 'México', 'HN': 'Honduras', 'GT': 'Guatemala', 'SV': 'El Salvador',
    'NI': 'Nicarágua', 'CR': 'Costa Rica', 'PA': 'Panamá', 'CO': 'Colômbia',
    'VE': 'Venezuela', 'EC': 'Equador', 'PE': 'Peru', 'BO': 'Bolívia',
    'PY': 'Paraguai', 'UY': 'Uruguai', 'AR': 'Argentina', 'BR': 'Brasil',
    'CL': 'Chile', 'DO': 'República Dominicana', 'CU': 'Cuba', 'PR': 'Porto Rico',
    'ES': 'Espanha', 'US': 'Estados Unidos', 'CA': 'Canadá',
};

export default function CountrySelector() {
    const { selectCountry } = useCountry();
    const { userProfile, loading: authLoading } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const t = useTranslations('countrySelector');
    const locale = useLocale();
    const router = useRouter();
    const pathname = usePathname();
    const isAdmin = userProfile?.roles?.admin === true;

    const [activeCountries, setActiveCountries] = useState<string[]>([]);
    const [settingsLoaded, setSettingsLoaded] = useState(false);
    const [inactiveModalItem, setInactiveModalItem] = useState<{code: string, name: string} | null>(null);

    useEffect(() => {
        const unsub = onSnapshot(doc(db, 'crm_settings', 'global'), snap => {
            if (snap.exists()) {
                const data = snap.data();
                if (data.activeCountries) {
                    setActiveCountries(data.activeCountries);
                }
            } else {
                // Fallback safe visual set if no settings exist
                setActiveCountries(['HN', 'MX', 'US', 'ES']);
            }
            setSettingsLoaded(true);
        });
        return () => unsub();
    }, []);

    // Country Selection component logic.
    const switchLocale = (newLocale: string) => {
        const segments = pathname.split('/');
        segments[1] = newLocale;
        router.replace(segments.join('/'));
    };

    // Resolve country name based on current locale
    const getCountryName = (code: string, defaultName: string): string => {
        if (locale === 'en') return COUNTRY_NAMES_EN[code] ?? defaultName;
        if (locale === 'pt-BR') return COUNTRY_NAMES_PT[code] ?? defaultName;
        return defaultName; // Spanish is the default
    };

    const uniqueCountries = Object.values(COUNTRIES).sort((a, b) => {
        const nameA = getCountryName(a.code, a.name);
        const nameB = getCountryName(b.code, b.name);
        return nameA.localeCompare(nameB, locale === 'pt-BR' ? 'pt' : locale);
    });

    const filtered = searchTerm
        ? uniqueCountries.filter(c =>
            c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.code.toLowerCase().includes(searchTerm.toLowerCase())
        )
        : uniqueCountries;

    const handleSelect = (code: CountryCode, name: string, isAvailable: boolean) => {
        if (!settingsLoaded || authLoading) return;
        if (isAvailable || isAdmin) {
            selectCountry(code);
        } else {
            setInactiveModalItem({ code, name });
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] bg-[#F4F6F8] flex flex-col overflow-hidden">

            {/* ── Ambient glow orbs ── */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-cyan-500/8 rounded-full blur-[120px]" />
                <div className="absolute -bottom-40 -right-40 w-[600px] h-[600px] bg-violet-600/8 rounded-full blur-[120px]" />
            </div>

            {/* ── Top bar: logo + language switcher ── */}
            <div className="relative z-10 shrink-0 flex items-center justify-between px-5 pt-[calc(1.25rem+env(safe-area-inset-top))] pb-3">
                {/* Logo image */}
                <div className="flex items-center">
                    <img src="/logo.png" alt="Pro24/7YA" className="h-7 w-auto object-contain" />
                </div>

                {/* Language pills */}
                <div className="flex items-center gap-1.5">
                    {LOCALES.map(({ code, label, flag }) => (
                        <button
                            key={code}
                            onClick={() => switchLocale(code)}
                            className={`
                                flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold
                                transition-all duration-200 select-none
                                ${locale === code
                                    ? 'bg-cyan-500/20 border border-cyan-400/50 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.25)]'
                                    : 'bg-white border border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                                }
                            `}
                        >
                            <span className="text-xs">{flag}</span>
                            <span>{label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Hero heading ── */}
            <div className="relative z-10 shrink-0 text-center px-6 pt-6 pb-2">
                <h1
                    className="text-3xl sm:text-4xl md:text-5xl font-semibold text-slate-800 tracking-tight leading-tight mb-2"
                    style={{ fontFamily: 'var(--font-outfit), sans-serif' }}
                >
                    {t('welcome')}
                </h1>
                <p className="text-slate-500 text-sm sm:text-base font-medium max-w-md mx-auto leading-relaxed">
                    {t('selectCountry')}
                </p>
            </div>

            {/* ── Search bar ── */}
            <div className="relative z-10 shrink-0 px-5 sm:px-10 py-4 max-w-2xl w-full mx-auto">
                <div className="relative group">
                    {/* Glow ring on focus */}
                    <div className="absolute -inset-px rounded-2xl bg-gradient-to-r from-cyan-500/0 via-cyan-500/40 to-cyan-500/0 opacity-0 group-focus-within:opacity-100 transition-opacity duration-500 blur-sm" />
                    <div className="relative flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-2xl px-5 h-14 group-focus-within:border-cyan-500/40 transition-colors duration-300">
                        <Search className="w-5 h-5 text-slate-500 group-focus-within:text-cyan-400 transition-colors shrink-0" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            placeholder={t('searchPlaceholder')}
                            className="bg-transparent border-none outline-none text-slate-900 text-base w-full placeholder:text-slate-400 font-medium"
                            autoFocus
                        />
                    </div>
                </div>
            </div>

            {/* ── Countries grid (scrollable) ── */}
            <div className="relative z-10 flex-1 overflow-y-auto px-5 sm:px-10 pb-8 pt-2">
                {filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 gap-3 text-slate-500">
                        <Globe className="w-10 h-10 opacity-20" />
                        <p className="text-sm">{t('noResults')} &ldquo;{searchTerm}&rdquo;</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 sm:gap-4">
                        {filtered.map(country => {
                            const cName = getCountryName(country.code, country.name);
                            // Highlight only if loaded and is actively configured in Global Settings
                            const isAvailable = settingsLoaded ? activeCountries.includes(country.code) : false;
                            
                            return (
                                <button
                                    key={country.code}
                                    onClick={() => handleSelect(country.code, cName, isAvailable)}
                                    className={`
                                        group relative flex flex-col items-center gap-2 p-2 sm:p-3 rounded-2xl
                                        border transition-all duration-200
                                        ${isAvailable 
                                            ? 'bg-white border-slate-200 hover:bg-slate-50 hover:border-[#14B8A6]/30 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(20,184,166,0.12)] active:scale-95' 
                                            : 'bg-slate-50/50 border-slate-100/50 opacity-80 hover:opacity-100 hover:bg-slate-50 active:scale-95'}
                                    `}
                                >
                                    {/* Active launch dot */}
                                    {isAvailable && (
                                        <span className="absolute top-2 right-2 w-[5px] h-[5px] rounded-full bg-cyan-400 align-top shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
                                    )}
                                    
                                    {/* Inactive PRONTO badge */}
                                    {!isAvailable && (
                                        <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-md px-1.5 py-[2px] rounded text-[8px] font-bold text-slate-500 shadow-sm border border-slate-100/80 z-10 transition-colors group-hover:text-cyan-600 uppercase tracking-wider">
                                            {t('inactiveLabel') || 'PRONTO'}
                                        </div>
                                    )}

                                    {/* Flag — Scaled down for 3-col grid */}
                                    <div className="w-[3.25rem] h-[2.25rem] sm:w-[4.25rem] sm:h-[3rem] rounded-lg overflow-hidden shadow-sm ring-1 ring-slate-200 group-hover:ring-[#14B8A6]/30 group-hover:shadow-[0_4px_12px_rgba(20,184,166,0.2)] transition-all duration-200">
                                        <img
                                            src={`https://flagcdn.com/w80/${country.code.toLowerCase()}.png`}
                                            alt={cName}
                                            className="w-full h-full object-cover"
                                            loading="lazy"
                                            onError={e => {
                                                const img = e.target as HTMLImageElement;
                                                img.style.display = 'none';
                                                const span = img.nextElementSibling as HTMLElement;
                                                if (span) span.style.display = 'flex';
                                            }}
                                        />
                                        <span
                                            className="hidden w-full h-full items-center justify-center text-3xl"
                                            style={{ display: 'none' }}
                                        >
                                            {country.flag}
                                        </span>
                                    </div>

                                    {/* Country name — localized */}
                                    <span className={`text-[11px] sm:text-xs font-semibold text-center leading-tight transition-colors duration-200 line-clamp-2 ${isAvailable ? 'text-slate-900 group-hover:text-[#0F766E]' : 'text-slate-500'}`}>
                                        {cName}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ── Inactive Country Modal ── */}
            {inactiveModalItem && (
                <div className="fixed inset-0 z-[99999] p-4 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm transition-opacity">
                    <div 
                        className="bg-white rounded-3xl shadow-2xl max-w-sm w-full relative overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header bg design */}
                        <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-br from-slate-100 to-slate-200 border-b border-slate-200 flex items-center justify-center">
                            <Globe size={40} className="text-slate-300" />
                        </div>
                        
                        {/* Close button */}
                        <button 
                            onClick={() => setInactiveModalItem(null)}
                            className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center bg-white/50 hover:bg-white rounded-full text-slate-600 transition-colors z-10"
                        >
                            <X size={18} />
                        </button>
                        
                        {/* Content */}
                        <div className="relative pt-20 px-6 pb-6 mt-1 flex flex-col items-center">
                            <div className="bg-white w-16 h-16 rounded-xl border-2 border-white shadow-md flex items-center justify-center overflow-hidden mb-3 absolute -top-8 left-1/2 -translate-x-1/2">
                                <img
                                    src={`https://flagcdn.com/w80/${inactiveModalItem.code.toLowerCase()}.png`}
                                    alt={inactiveModalItem.name}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            
                            <h3 className="text-lg font-bold text-slate-900 text-center mb-1">
                                {inactiveModalItem.name}
                            </h3>
                            <p className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase mb-4">
                                {t('inactiveTitle') || 'PRÓXIMAMENTE'}
                            </p>
                            
                            <p className="text-sm text-slate-500 text-center mb-6 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
                                {t('inactiveDesc') || 'Este país no está disponible. Próximamente abriremos operaciones aquí.'}
                            </p>
                            
                            {/* Available countries list */}
                            <div className="w-full">
                                <p className="text-xs font-semibold text-slate-400 mb-2 flex items-center gap-1.5">
                                    <MapPin size={12} className="text-[#14B8A6]" />
                                    {t('availableNow') || 'Países disponibles actualmente:'}
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                    {activeCountries.map(code => {
                                        const c = uniqueCountries.find(x => x.code === code);
                                        return c ? (
                                            <span key={code} className="inline-flex items-center gap-1 bg-cyan-50 text-cyan-700 border border-cyan-100 text-[10px] font-semibold px-2 py-1 rounded-md">
                                                {c.flag} {c.name}
                                            </span>
                                        ) : null;
                                    })}
                                </div>
                            </div>
                            
                            <button 
                                onClick={() => setInactiveModalItem(null)}
                                className="mt-6 w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-sm transition-colors shadow-sm cursor-pointer"
                            >
                                Entendido
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

