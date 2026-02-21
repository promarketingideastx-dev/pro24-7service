'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useAdminContext } from '@/context/AdminContext';
import { onSnapshot, query, collection, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Map, RefreshCw, Building2, Crown, Star, Zap, Users, ToggleLeft, ToggleRight } from 'lucide-react';
import { toast } from 'sonner';
import 'leaflet/dist/leaflet.css';
import type { MapPoint } from '@/components/admin/BusinessMap';

const BusinessMap = dynamic(() => import('@/components/admin/BusinessMap'), { ssr: false });

const STATUS_LEGEND = [
    { key: 'active', label: 'Activo', dot: '#22c55e' },
    { key: 'suspended', label: 'Suspendido', dot: '#ef4444' },
    { key: 'pending', label: 'Pendiente', dot: '#f59e0b' },
];
const PLAN_LEGEND = [
    { key: 'free', label: 'Free', dot: '#94a3b8' },
    { key: 'premium', label: 'Premium', dot: '#60a5fa' },
    { key: 'plus_team', label: 'Plus', dot: '#a78bfa' },
    { key: 'vip', label: 'VIP', dot: '#fbbf24' },
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
    const [colorBy, setColorBy] = useState<'status' | 'plan'>('status');
    const [statusFilter, setStatusFilter] = useState('all');
    const [loading, setLoading] = useState(true);

    // Real-time listener
    useEffect(() => {
        setLoading(true);
        const q = query(collection(db, 'businesses_public'), limit(500));
        const unsub = onSnapshot(q, (snap) => {
            const pts: MapPoint[] = [];
            snap.docs.forEach((d) => {
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
                        status: data.status ?? 'active',
                        suspended: data.suspended === true,
                        coverImage: data.coverImage,
                    });
                }
            });
            setAllPoints(pts);
            setLoading(false);
        }, () => {
            toast.error('Error cargando mapa');
            setLoading(false);
        });
        return () => unsub();
    }, []);


    useEffect(() => {
        let pts = allPoints;
        if (selectedCountry !== 'ALL') pts = pts.filter(p => p.country === selectedCountry);
        if (statusFilter !== 'all') {
            pts = pts.filter(p => {
                if (statusFilter === 'suspended') return p.suspended || p.status === 'suspended';
                if (statusFilter === 'active') return !p.suspended && p.status !== 'suspended' && p.status !== 'pending';
                if (statusFilter === 'pending') return p.status === 'pending';
                return true;
            });
        }
        setFiltered(pts);
    }, [allPoints, selectedCountry, statusFilter]);

    const base = selectedCountry === 'ALL' ? allPoints : allPoints.filter(p => p.country === selectedCountry);
    const activeCount = base.filter(p => !p.suspended && p.status !== 'suspended' && p.status !== 'pending').length;
    const suspendedCount = base.filter(p => p.suspended || p.status === 'suspended').length;
    const pendingCount = base.filter(p => p.status === 'pending').length;

    const center: [number, number] = COUNTRY_CENTER[selectedCountry] ?? COUNTRY_CENTER.ALL;
    const zoom = COUNTRY_ZOOM[selectedCountry] ?? 5;
    const legend = colorBy === 'status' ? STATUS_LEGEND : PLAN_LEGEND;

    return (
        <div className="flex flex-col gap-3" style={{ height: 'calc(100vh - 110px)' }}>

            {/* ── Header ── */}
            <div className="flex flex-wrap items-center gap-3">
                <div>
                    <h1 className="text-lg font-bold text-white flex items-center gap-2">
                        <Map size={20} className="text-brand-neon-cyan" /> Mapa de Negocios
                    </h1>
                    <p className="text-[11px] text-slate-500">
                        {filtered.length} de {base.length} negocios
                        {selectedCountry !== 'ALL' && ` · ${selectedCountry}`}
                    </p>
                </div>

                {/* Status filter pills */}
                <div className="flex gap-1.5 flex-wrap flex-1">
                    {[
                        { key: 'all', label: 'Todos', count: base.length, dot: null },
                        { key: 'active', label: 'Activos', count: activeCount, dot: '#22c55e' },
                        { key: 'suspended', label: 'Suspendidos', count: suspendedCount, dot: '#ef4444' },
                        { key: 'pending', label: 'Pendientes', count: pendingCount, dot: '#f59e0b' },
                    ].map(f => (
                        <button key={f.key} onClick={() => setStatusFilter(f.key)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all border ${statusFilter === f.key ? 'border-white/20 bg-white/10 text-white' : 'bg-white/3 border-white/8 text-slate-400 hover:text-white'}`}>
                            {f.dot && <span className="w-2 h-2 rounded-full" style={{ background: f.dot }} />}
                            {f.label}
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${f.count > 0 ? 'bg-white/10 text-white' : 'bg-white/5 text-slate-600'}`}>
                                {f.count}
                            </span>
                        </button>
                    ))}
                </div>

                {/* ColorBy toggle */}
                <button onClick={() => setColorBy(c => c === 'status' ? 'plan' : 'status')}
                    className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl text-xs text-slate-300 transition-colors">
                    {colorBy === 'status' ? <ToggleRight size={14} className="text-brand-neon-cyan" /> : <ToggleLeft size={14} />}
                    Color por: <strong className="text-white">{colorBy === 'status' ? 'Estado' : 'Plan'}</strong>
                </button>


            </div>

            {/* ── Map ── */}
            <div className="flex-1 border border-white/10 rounded-2xl overflow-hidden relative shadow-xl">
                {loading ? (
                    <div className="flex items-center justify-center h-full bg-slate-100">
                        <div className="w-8 h-8 border-2 border-brand-neon-cyan/30 border-t-brand-neon-cyan rounded-full animate-spin" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full bg-slate-100 gap-2">
                        <Map size={32} className="text-slate-400" />
                        <p className="text-sm text-slate-500">Sin negocios con ubicación para este filtro</p>
                    </div>
                ) : (
                    <BusinessMap points={filtered} center={center} zoom={zoom} colorBy={colorBy} />
                )}

                {/* Floating legend */}
                <div className="absolute bottom-8 right-3 z-[1000] bg-white/95 backdrop-blur shadow-lg border border-slate-200 rounded-xl px-3 py-2.5 flex flex-col gap-1.5 text-[11px]">
                    <p className="text-slate-400 font-semibold uppercase tracking-wider text-[9px] mb-0.5">
                        {colorBy === 'status' ? 'Por Estado' : 'Por Plan'}
                    </p>
                    {legend.map(l => (
                        <span key={l.key} className="flex items-center gap-2 text-slate-700">
                            <span className="w-3 h-3 rounded-full shrink-0 border-2 border-white shadow"
                                style={{ background: l.dot, boxShadow: `0 0 5px ${l.dot}88` }} />
                            {l.label}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
}
