'use client';

import React, { useState } from 'react';
import { useCountry } from '@/context/CountryContext';
import { COUNTRIES, CountryCode } from '@/lib/locations';
import { Search, Globe } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';

const LOCALES = [
    { code: 'es', label: 'ES', flag: '🇪🇸' },
    { code: 'en', label: 'EN', flag: '🇺🇸' },
    { code: 'pt-BR', label: 'PT', flag: '🇧🇷' },
] as const;

// Country name translations for non-spanish locales
// Most country names are the same across all 3 supported languages
// We only need to override where they differ significantly
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

const PRIORITY_ORDER: CountryCode[] = ['MX', 'HN', 'US', 'ES', 'CO', 'AR', 'CL', 'PE'];

export default function CountrySelector() {
    const { selectCountry } = useCountry();
    const [searchTerm, setSearchTerm] = useState('');
    const t = useTranslations('countrySelector');
    const locale = useLocale();
    const router = useRouter();
    const pathname = usePathname();

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

    const allCountries = PRIORITY_ORDER
        .map(code => COUNTRIES[code])
        .filter(Boolean)
        .concat(Object.values(COUNTRIES).filter(c => !PRIORITY_ORDER.includes(c.code)));

    const uniqueCountries = Array.from(new Map(allCountries.map(c => [c.code, c])).values());

    const filtered = searchTerm
        ? uniqueCountries.filter(c =>
            c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.code.toLowerCase().includes(searchTerm.toLowerCase())
        )
        : uniqueCountries;

    return (
        <div className="fixed inset-0 z-[9999] bg-[#050b14] flex flex-col overflow-hidden">

            {/* ── Ambient glow orbs ── */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-cyan-500/8 rounded-full blur-[120px]" />
                <div className="absolute -bottom-40 -right-40 w-[600px] h-[600px] bg-violet-600/8 rounded-full blur-[120px]" />
            </div>

            {/* ── Top bar: logo + language switcher ── */}
            <div className="relative z-10 shrink-0 flex items-center justify-between px-5 pt-5 pb-3">
                {/* Logo wordmark */}
                <span className="text-lg font-black tracking-tight select-none">
                    <span className="text-white">Pro</span>
                    <span className="text-cyan-400">24/7YA</span>
                </span>

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
                                    : 'bg-slate-50 border border-slate-200 text-slate-400 hover:text-slate-200 hover:bg-slate-100'
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
                <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-white tracking-tight leading-none mb-3">
                    {t('welcome')}
                </h1>
                <p className="text-slate-400 text-base sm:text-lg font-medium max-w-md mx-auto leading-relaxed">
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
                            className="bg-transparent border-none outline-none text-white text-base w-full placeholder:text-slate-600 font-medium"
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
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                        {filtered.map(country => {
                            const isPriority = PRIORITY_ORDER.includes(country.code) && !searchTerm;
                            return (
                                <button
                                    key={country.code}
                                    onClick={() => selectCountry(country.code)}
                                    className="
                                        group relative flex flex-col items-center gap-3 p-4 rounded-2xl
                                        bg-white/4 border border-white/6
                                        hover:bg-slate-50 hover:border-cyan-400/30
                                        hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(6,182,212,0.12)]
                                        active:scale-95
                                        transition-all duration-200
                                    "
                                >
                                    {/* Priority dot */}
                                    {isPriority && (
                                        <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 rounded-full bg-cyan-400/60 shadow-[0_0_6px_rgba(6,182,212,0.8)]" />
                                    )}

                                    {/* Flag — 50% larger than original */}
                                    <div className="w-20 h-14 rounded-xl overflow-hidden shadow-lg ring-1 ring-white/10 group-hover:ring-cyan-400/30 group-hover:shadow-[0_4px_16px_rgba(6,182,212,0.2)] transition-all duration-200">
                                        <img
                                            src={`https://flagcdn.com/w160/${country.code.toLowerCase()}.png`}
                                            alt={getCountryName(country.code, country.name)}
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
                                    <span className="text-white text-sm font-semibold text-center leading-tight group-hover:text-cyan-300 transition-colors duration-200 line-clamp-2">
                                        {getCountryName(country.code, country.name)}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
