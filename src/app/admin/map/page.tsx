'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useAdminContext } from '@/context/AdminContext';
import { getDocs, query, collection, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Map, RefreshCw, Building2, Crown, Star, Zap, Users } from 'lucide-react';
import { toast } from 'sonner';
import 'leaflet/dist/leaflet.css';

const BusinessMap = dynamic(() => import('@/components/admin/BusinessMap'), { ssr: false });

interface MapPoint {
    lat: number;
    lng: number;
    name: string;
    city?: string;
    country?: string;
    plan?: string;
    category?: string;
}

const PLANS = [
    { key: 'all', label: 'Todos', icon: <Building2 size={13} />, dotClass: 'bg-white/30', color: '#94a3b8' },
    { key: 'free', label: 'Free', icon: <Zap size={13} />, dotClass: 'bg-slate-400', color: '#94a3b8' },
    { key: 'premium', label: 'Premium', icon: <Star size={13} />, dotClass: 'bg-blue-400', color: '#60a5fa' },
    { key: 'plus_team', label: 'Plus', icon: <Users size={13} />, dotClass: 'bg-purple-400', color: '#a78bfa' },
    { key: 'vip', label: 'VIP', icon: <Crown size={13} />, dotClass: 'bg-amber-400', color: '#fbbf24' },
];

const COUNTRY_CENTER: Record<string, [number, number]> = {
    ALL: [14.5, -86.5], HN: [14.9, -87.2], GT: [15.5, -90.2], SV: [13.8, -89.2],
    MX: [23.6, -102.5], US: [37.1, -95.7], CO: [4.5, -74.3], BR: [-14.2, -51.9],
    CA: [56.1, -106.3], ES: [40.4, -3.7], NI: [12.9, -85.2], CR: [9.7, -84.0], PA: [8.5, -80.8],
};
const COUNTRY_ZOOM: Record<string, number> = {
    ALL: 4, HN: 8, GT: 8, SV: 9, MX: 5, US: 4, CO: 6, BR: 4, CA: 4, ES: 6, NI: 8, CR: 9, PA: 8,
};

export default function AdminMapPage() {
    const { selectedCountry } = useAdminContext();
    const [allPoints, setAllPoints] = useState<MapPoint[]>([]);
    const [filtered, setFiltered] = useState<MapPoint[]>([]);
    const [planFilter, setPlanFilter] = useState('all');
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const snap = await getDocs(query(collection(db, 'businesses_public'), limit(500)));
            const pts: MapPoint[] = [];
            snap.docs.forEach(d => {
                const data = d.data();
                const lat = data.location?.lat ?? data.lat;
                const lng = data.location?.lng ?? data.lng;
                if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
                    pts.push({
                        lat, lng,
                        name: data.name ?? '—',
                        city: data.city,
                        country: data.country,
                        plan: data.planData?.plan ?? 'free',
                        category: data.category,
                    });
                }
            });
            setAllPoints(pts);
        } catch (e) {
            toast.error('Error cargando mapa');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    useEffect(() => {
        let pts = allPoints;
        if (selectedCountry !== 'ALL') pts = pts.filter(p => p.country === selectedCountry);
        if (planFilter !== 'all') pts = pts.filter(p => p.plan === planFilter);
        setFiltered(pts);
    }, [allPoints, selectedCountry, planFilter]);

    const center: [number, number] = COUNTRY_CENTER[selectedCountry] ?? COUNTRY_CENTER.ALL;
    const zoom = COUNTRY_ZOOM[selectedCountry] ?? 5;

    // Counts per plan from filtered (before plan filter)
    const baseFiltered = selectedCountry === 'ALL' ? allPoints : allPoints.filter(p => p.country === selectedCountry);
    const counts: Record<string, number> = { all: baseFiltered.length };
    baseFiltered.forEach(p => { const pl = p.plan ?? 'free'; counts[pl] = (counts[pl] ?? 0) + 1; });

    return (
        <div className="flex flex-col h-full gap-0" style={{ height: 'calc(100vh - 100px)' }}>

            {/* ─── Header Row ─── */}
            <div className="flex flex-wrap items-center gap-3 mb-3">
                {/* Title */}
                <div className="mr-2">
                    <h1 className="text-lg font-bold text-white flex items-center gap-2">
                        <Map size={20} className="text-brand-neon-cyan" /> Mapa de Negocios
                    </h1>
                    <p className="text-[11px] text-slate-500">{baseFiltered.length} negocios con ubicación{selectedCountry !== 'ALL' && ` · ${selectedCountry}`}</p>
                </div>

                {/* Plan filter buttons (with counts) */}
                <div className="flex gap-1.5 flex-wrap flex-1">
                    {PLANS.map(f => {
                        const count = f.key === 'all' ? baseFiltered.length : (counts[f.key] ?? 0);
                        const active = planFilter === f.key;
                        return (
                            <button key={f.key} onClick={() => setPlanFilter(f.key)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all border ${active ? 'border-white/20 bg-white/10 text-white' : 'bg-white/3 border-white/8 text-slate-400 hover:text-white'}`}>
                                {/* Color dot */}
                                <span className={`w-2 h-2 rounded-full ${f.dotClass}`} />
                                {f.label}
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${count > 0 ? 'bg-white/10 text-white' : 'bg-white/5 text-slate-600'}`}>
                                    {count}
                                </span>
                            </button>
                        );
                    })}
                </div>

                <button onClick={load} disabled={loading}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs text-slate-300 transition-colors ml-auto">
                    <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Actualizar
                </button>
            </div>

            {/* ─── Map (full remaining height) ─── */}
            <div className="flex-1 bg-[#0a1128] border border-white/5 rounded-2xl overflow-hidden relative">
                {loading ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="w-8 h-8 border-2 border-brand-neon-cyan/30 border-t-brand-neon-cyan rounded-full animate-spin" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-2">
                        <Map size={32} className="opacity-20" />
                        <p className="text-sm">Sin negocios con ubicación para este filtro</p>
                        <p className="text-xs text-slate-600">Los puntos aparecerán cuando los negocios se registren</p>
                    </div>
                ) : (
                    <BusinessMap points={filtered} center={center} zoom={zoom} />
                )}

                {/* Floating legend bottom-left */}
                <div className="absolute bottom-4 left-4 z-[1000] bg-[#0a1128]/90 backdrop-blur border border-white/10 rounded-xl px-3 py-2.5 flex flex-col gap-1.5 text-[10px]">
                    <p className="text-slate-500 font-semibold uppercase tracking-wider mb-0.5">Leyenda</p>
                    {PLANS.slice(1).map(p => (
                        <span key={p.key} className="flex items-center gap-2 text-slate-300">
                            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${p.dotClass}`}
                                style={{ boxShadow: `0 0 6px ${p.color}88` }} />
                            {p.label}
                            <span className="ml-auto text-slate-500 pl-2">{counts[p.key] ?? 0}</span>
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
}
