'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useAdminContext } from '@/context/AdminContext';
import { getDocs, query, collection, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Map, RefreshCw, Building2, Crown, Star, Zap, Users } from 'lucide-react';
import { toast } from 'sonner';
import 'leaflet/dist/leaflet.css';

// Dynamic import to avoid SSR issues with Leaflet
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

const PLAN_FILTERS = [
    { key: 'all', label: 'Todos', icon: <Building2 size={13} /> },
    { key: 'free', label: 'Free', icon: <Zap size={13} /> },
    { key: 'premium', label: 'Premium', icon: <Star size={13} /> },
    { key: 'plus_team', label: 'Plus', icon: <Users size={13} /> },
    { key: 'vip', label: 'VIP', icon: <Crown size={13} /> },
];

const PLAN_DOT: Record<string, string> = {
    free: 'bg-slate-400',
    premium: 'bg-blue-400',
    plus_team: 'bg-purple-400',
    vip: 'bg-amber-400',
};

// Center by country
const COUNTRY_CENTER: Record<string, [number, number]> = {
    ALL: [14.5, -86.5],
    HN: [14.9, -87.2],
    GT: [15.5, -90.2],
    SV: [13.8, -89.2],
    MX: [23.6, -102.5],
    US: [37.1, -95.7],
    CO: [4.5, -74.3],
    BR: [-14.2, -51.9],
    CA: [56.1, -106.3],
    ES: [40.4, -3.7],
    NI: [12.9, -85.2],
    CR: [9.7, -84.0],
    PA: [8.5, -80.8],
};

const COUNTRY_ZOOM: Record<string, number> = {
    ALL: 4, HN: 8, GT: 8, SV: 9, MX: 5, US: 4, CO: 6, BR: 4, CA: 4, ES: 6,
    NI: 8, CR: 9, PA: 8,
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
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    // Apply filters
    useEffect(() => {
        let pts = allPoints;
        if (selectedCountry !== 'ALL') {
            pts = pts.filter(p => p.country === selectedCountry);
        }
        if (planFilter !== 'all') {
            pts = pts.filter(p => p.plan === planFilter);
        }
        setFiltered(pts);
    }, [allPoints, selectedCountry, planFilter]);

    const center: [number, number] = COUNTRY_CENTER[selectedCountry] ?? COUNTRY_CENTER.ALL;
    const zoom = COUNTRY_ZOOM[selectedCountry] ?? 5;

    // Count by plan
    const counts = filtered.reduce((acc, p) => {
        acc[p.plan ?? 'free'] = (acc[p.plan ?? 'free'] ?? 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    return (
        <div className="flex flex-col h-full gap-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Map size={24} className="text-brand-neon-cyan" /> Mapa de Negocios
                    </h1>
                    <p className="text-slate-500 text-xs mt-0.5">
                        {filtered.length} negocios con ubicación
                        {selectedCountry !== 'ALL' && ` · ${selectedCountry}`}
                    </p>
                </div>
                <button onClick={load} disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm text-slate-300 transition-colors">
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Actualizar
                </button>
            </div>

            {/* Controls row */}
            <div className="flex flex-wrap items-center gap-2">
                {/* Plan filter */}
                <div className="flex gap-1.5 flex-wrap">
                    {PLAN_FILTERS.map(f => (
                        <button key={f.key} onClick={() => setPlanFilter(f.key)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors border ${planFilter === f.key ? 'bg-brand-neon-cyan/10 border-brand-neon-cyan/30 text-brand-neon-cyan' : 'bg-white/3 border-white/8 text-slate-400 hover:text-white'}`}>
                            {f.icon} {f.label}
                            {f.key !== 'all' && <span className="ml-0.5 opacity-60">{counts[f.key] ?? 0}</span>}
                            {f.key === 'all' && <span className="ml-0.5 opacity-60">{filtered.length}</span>}
                        </button>
                    ))}
                </div>

                {/* Legend */}
                <div className="flex items-center gap-3 ml-auto text-[10px] text-slate-500">
                    {Object.entries(PLAN_DOT).map(([plan, cls]) => (
                        <span key={plan} className="flex items-center gap-1">
                            <span className={`w-2 h-2 rounded-full ${cls}`} />
                            {plan === 'plus_team' ? 'Plus' : plan.charAt(0).toUpperCase() + plan.slice(1)}
                        </span>
                    ))}
                </div>
            </div>

            {/* Map */}
            <div className="flex-1 min-h-[500px] bg-[#0a1128] border border-white/5 rounded-2xl overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="w-8 h-8 border-2 border-brand-neon-cyan/30 border-t-brand-neon-cyan rounded-full animate-spin" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-2">
                        <Map size={32} className="opacity-30" />
                        <p className="text-sm">No hay negocios con ubicación en este filtro</p>
                    </div>
                ) : (
                    <BusinessMap points={filtered} center={center} zoom={zoom} />
                )}
            </div>
        </div>
    );
}
