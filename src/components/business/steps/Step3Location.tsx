'use client';

import { useState, useEffect, useRef } from 'react';
import { MapPin, Search, Loader2, CheckCircle } from 'lucide-react';

// ── Nominatim autocomplete ────────────────────────────────────────────────────
interface NominatimResult {
    place_id: number;
    display_name: string;
    lat: string;
    lon: string;
    address: {
        city?: string;
        town?: string;
        village?: string;
        state?: string;
        country?: string;
        country_code?: string;
        road?: string;
        house_number?: string;
        postcode?: string;
    };
}

function useNominatimSearch(query: string, enabled: boolean) {
    const [results, setResults] = useState<NominatimResult[]>([]);
    const [loading, setLoading] = useState(false);
    const lastQuery = useRef('');

    useEffect(() => {
        if (!enabled || query.length < 3) { setResults([]); return; }
        if (query === lastQuery.current) return;
        lastQuery.current = query;

        const controller = new AbortController();
        const timer = setTimeout(async () => {
            setLoading(true);
            try {
                const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=6&q=${encodeURIComponent(query)}&accept-language=es`;
                const res = await fetch(url, {
                    headers: { 'User-Agent': 'PRO24-7-CRM/1.0' },
                    signal: controller.signal,
                });
                const data: NominatimResult[] = await res.json();
                setResults(data);
            } catch { /* cancelled or network error */ }
            finally { setLoading(false); }
        }, 450); // debounce 450ms

        return () => { clearTimeout(timer); controller.abort(); };
    }, [query, enabled]);

    return { results, loading };
}

// ── Component ─────────────────────────────────────────────────────────────────
export function Step3Location({ data, update }: any) {
    const [searchQuery, setSearchQuery] = useState('');
    const [showResults, setShowResults] = useState(false);
    const [geocoded, setGeocoded] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const { results, loading } = useNominatimSearch(searchQuery, showResults || searchQuery.length >= 3);

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
                setShowResults(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleSelect = (place: NominatimResult) => {
        const addr = place.address;
        const city = addr.city ?? addr.town ?? addr.village ?? '';
        const country = (addr.country_code ?? 'HN').toUpperCase();
        const department = addr.state ?? '';
        const road = `${addr.road ?? ''}${addr.house_number ? ' ' + addr.house_number : ''}`.trim();

        update('address', road || place.display_name.split(',')[0]);
        update('city', city);
        update('department', department);
        update('country', country);
        update('lat', parseFloat(place.lat));
        update('lng', parseFloat(place.lon));

        setSearchQuery(place.display_name.split(',').slice(0, 3).join(',').trim());
        setShowResults(false);
        setGeocoded(true);
    };

    const showAddressFields = data.modality === 'local' || data.modality === 'both';
    const showCoverageFields = data.modality === 'home' || data.modality === 'both';

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-3xl font-bold mb-2">Ubicación y Modalidad</h2>
                <p className="text-slate-400">Define cómo y dónde entregarás tus servicios a los clientes.</p>
            </div>

            {/* 1. Modality Selection */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                    { id: 'local', label: 'En mi Local', icon: '🏪', desc: 'El cliente viene a mí' },
                    { id: 'home', label: 'A Domicilio', icon: '🚚', desc: 'Yo voy donde el cliente' },
                    { id: 'both', label: 'Ambos', icon: '🔄', desc: 'Tengo local y también me movilizo' },
                ].map(option => (
                    <div key={option.id}
                        onClick={() => update('modality', option.id)}
                        className={`cursor-pointer p-6 rounded-xl border text-center transition-all ${data.modality === option.id
                            ? 'bg-blue-600/20 border-blue-500 ring-1 ring-blue-500'
                            : 'bg-slate-800 border-white/5 hover:bg-slate-700/50'
                            }`}>
                        <div className="text-4xl mb-4">{option.icon}</div>
                        <h3 className={`font-bold text-lg mb-1 ${data.modality === option.id ? 'text-white' : 'text-slate-200'}`}>{option.label}</h3>
                        <p className="text-sm text-slate-400">{option.desc}</p>
                    </div>
                ))}
            </div>

            {/* 2. Places Autocomplete (shown if modality selected) */}
            {data.modality && (
                <div className="animate-in fade-in slide-in-from-top-4 duration-400 bg-slate-800/50 p-6 rounded-xl border border-white/5 space-y-5">
                    <h3 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
                        <MapPin size={18} className="text-blue-400" />
                        {showAddressFields ? '📍 Dirección del Local / Taller' : '🗺️ Zonas de Cobertura'}
                    </h3>

                    {/* ── Nominatim Search Box ── */}
                    <div ref={wrapperRef} className="relative">
                        <label className="text-sm text-slate-400 mb-2 block">
                            Buscar dirección <span className="text-blue-400 text-xs">(autocompletado)</span>
                        </label>
                        <div className="relative">
                            {loading
                                ? <Loader2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 animate-spin" />
                                : geocoded
                                    ? <CheckCircle size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-green-400" />
                                    : <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            }
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={e => { setSearchQuery(e.target.value); setShowResults(true); setGeocoded(false); }}
                                onFocus={() => setShowResults(true)}
                                placeholder="Ej. Colonia Palmira, Tegucigalpa..."
                                className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 pl-9 py-3 text-white outline-none focus:border-blue-500 transition-colors"
                            />
                        </div>

                        {/* Dropdown */}
                        {showResults && results.length > 0 && (
                            <ul className="absolute top-full left-0 right-0 mt-1 bg-[#1a2035] border border-white/10 rounded-xl overflow-hidden z-[500] shadow-2xl">
                                {results.map(r => (
                                    <li key={r.place_id}
                                        onMouseDown={() => handleSelect(r)}
                                        className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-white/5 border-b border-white/5 last:border-b-0 transition-colors">
                                        <MapPin size={14} className="text-blue-400 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-white text-sm leading-snug">{r.display_name.split(',')[0]}</p>
                                            <p className="text-slate-500 text-xs mt-0.5 truncate">{r.display_name.split(',').slice(1).join(',').trim()}</p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    {/* Geocoded confirmation */}
                    {geocoded && data.lat && data.lng && (
                        <div className="flex items-center gap-2 text-green-400 text-sm bg-green-500/10 px-3 py-2 rounded-lg border border-green-500/20">
                            <CheckCircle size={14} className="shrink-0" />
                            <span>Ubicación detectada: <strong>{data.city}</strong>{data.department ? `, ${data.department}` : ''}, {data.country}</span>
                            <span className="ml-auto text-green-600 text-xs">({Number(data.lat).toFixed(4)}, {Number(data.lng).toFixed(4)})</span>
                        </div>
                    )}

                    {/* Manual overrides */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                        <div>
                            <label className="text-sm text-slate-400 mb-1 block">País</label>
                            <select
                                value={data.country || 'HN'}
                                onChange={e => update('country', e.target.value)}
                                className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-3 text-white outline-none focus:border-blue-500">
                                <option value="HN">Honduras 🇭🇳</option>
                                <option value="SV">El Salvador 🇸🇻</option>
                                <option value="GT">Guatemala 🇬🇹</option>
                                <option value="MX">México 🇲🇽</option>
                                <option value="US">Estados Unidos 🇺🇸</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-sm text-slate-400 mb-1 block">Departamento / Estado</label>
                            <input type="text" value={data.department || ''}
                                onChange={e => update('department', e.target.value)}
                                placeholder="Ej. Cortés"
                                className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-3 text-white outline-none focus:border-blue-500" />
                        </div>
                        <div>
                            <label className="text-sm text-slate-400 mb-1 block">Ciudad</label>
                            <input type="text" value={data.city || ''}
                                onChange={e => update('city', e.target.value)}
                                placeholder="Ej. San Pedro Sula"
                                className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-3 text-white outline-none focus:border-blue-500" />
                        </div>
                        {showAddressFields && (
                            <div>
                                <label className="text-sm text-slate-400 mb-1 block">Dirección Exacta</label>
                                <input type="text" value={data.address || ''}
                                    onChange={e => update('address', e.target.value)}
                                    placeholder="Ej. Col. Palmira, Edificio X"
                                    className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-3 text-white outline-none focus:border-blue-500" />
                            </div>
                        )}
                    </div>

                    {showCoverageFields && (
                        <div>
                            <label className="text-sm text-slate-400 mb-1 block">Zonas de Cobertura</label>
                            <input type="text"
                                value={data.coverageZones || ''}
                                onChange={e => update('coverageZones', e.target.value)}
                                placeholder="Ej. Todo el casco urbano, Valle de Ángeles..."
                                className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-3 text-white outline-none focus:border-blue-500" />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
