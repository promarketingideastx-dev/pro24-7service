'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { useAdminContext } from '@/context/AdminContext';
import { onSnapshot, query, collection, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Map, ToggleLeft, ToggleRight } from 'lucide-react';
import { toast } from 'sonner';
import 'leaflet/dist/leaflet.css';
import type { MapPoint } from '@/components/admin/BusinessMap';
import BusinessPreviewPanel from '@/components/admin/BusinessPreviewPanel';

const BusinessMap = dynamic(() => import('@/components/admin/BusinessMap'), { ssr: false });

// ── Honduras dept fallback coords (same logic as businessProfile.service) ──
const HN_DEPT_COORDS: Record<string, [number, number]> = {
    'atlantida': [15.7697, -86.7862], 'choluteca': [13.2999, -87.1919],
    'colon': [15.8620, -86.0205], 'comayagua': [14.4532, -87.6376],
    'copan': [14.8380, -89.1465], 'cortes': [15.5031, -88.0255],
    'el paraiso': [13.7791, -86.3631], 'francisco morazan': [14.0899, -87.2021],
    'gracias a dios': [15.9264, -84.5311], 'intibuca': [14.3154, -88.1769],
    'islas de la bahia': [16.3350, -86.5291], 'la paz': [14.3200, -87.6738],
    'lempira': [14.4338, -88.5727], 'ocotepeque': [14.4365, -89.1832],
    'olancho': [14.7870, -86.2395], 'santa barbara': [14.9196, -88.2348],
    'valle': [13.4441, -87.7311], 'yoro': [15.1400, -87.1259],
};

function getDeptCoords(dept?: string, country?: string): [number, number] | null {
    if ((country || 'HN').toUpperCase() !== 'HN' || !dept) return null;
    const key = dept.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const match = Object.entries(HN_DEPT_COORDS).find(([k]) =>
        k.startsWith(key) || key.startsWith(k)
    );
    return match ? match[1] : null;
}

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
    const t = useTranslations('admin.map');

    const STATUS_LEGEND = [
        { key: 'active', label: t('active'), dot: '#22c55e' },
        { key: 'suspended', label: t('suspended'), dot: '#ef4444' },
        { key: 'pending', label: t('pending'), dot: '#f59e0b' },
    ];
    const PLAN_LEGEND = [
        { key: 'free', label: 'Free', dot: '#94a3b8' },
        { key: 'premium', label: 'Premium', dot: '#60a5fa' },
        { key: 'plus_team', label: 'Plus', dot: '#a78bfa' },
        { key: 'vip', label: 'VIP', dot: '#fbbf24' },
    ];

    const [allPoints, setAllPoints] = useState<MapPoint[]>([]);
    const [filtered, setFiltered] = useState<MapPoint[]>([]);
    const [colorBy, setColorBy] = useState<'status' | 'plan'>('status');
    const [statusFilter, setStatusFilter] = useState('all');
    const [loading, setLoading] = useState(true);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    // ── Real-time Firestore listener — auto-refreshes on every change ──
    useEffect(() => {
        setLoading(true);
        const q = query(collection(db, 'businesses_public'), limit(500));
        const unsub = onSnapshot(q, (snap) => {
            const pts: MapPoint[] = [];
            snap.docs.forEach((d) => {
                const data = d.data();
                let lat = data.location?.lat ?? data.lat;
                let lng = data.location?.lng ?? data.lng;

                // Fallback to department/country coords when location is missing or zero
                if (!lat || !lng || lat === 0 || lng === 0) {
                    const fb = getDeptCoords(data.department, data.country);
                    if (fb) {
                        [lat, lng] = fb;
                    } else {
                        const cc = (data.country || 'HN').toUpperCase();
                        [lat, lng] = COUNTRY_CENTER[cc] ?? COUNTRY_CENTER.ALL;
                    }
                }

                pts.push({
                    id: d.id,
                    lat, lng,
                    name: data.name ?? '—',
                    city: data.city,
                    country: data.country,
                    plan: data.planData?.plan ?? 'free',
                    category: data.category,
                    status: data.status ?? 'active',
                    suspended: data.suspended === true,
                    coverImage: data.logoUrl || data.coverImage || undefined, // prefer logo (avatar) over cover
                });
            });
            setAllPoints(pts);
            setLastUpdated(new Date());
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
        <>
            <div className="flex flex-col gap-3" style={{ height: 'calc(100vh - 110px)' }}>

                {/* ── Header ── */}
                <div className="flex flex-wrap items-center gap-3">
                    <div>
                        <h1 className="text-lg font-bold text-white flex items-center gap-2">
                            <Map size={20} className="text-brand-neon-cyan" />
                            {t('title')}
                            {/* Live indicator */}
                            <span className="flex items-center gap-1.5 text-[10px] font-normal text-green-400 bg-green-400/10 border border-green-400/20 px-2 py-0.5 rounded-full">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                                En vivo
                            </span>
                        </h1>
                        <p className="text-[11px] text-slate-500">
                            {filtered.length} de {base.length} {t('businesses')}
                            {selectedCountry !== 'ALL' && ` · ${selectedCountry}`}
                            {lastUpdated && (
                                <span className="ml-2 text-slate-600">
                                    · Actualizado {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                </span>
                            )}
                            {selectedId && <span className="ml-2 text-brand-neon-cyan">· {t('panelOpen')}</span>}
                        </p>
                    </div>

                    {/* Status filter pills */}
                    <div className="flex gap-1.5 flex-wrap flex-1">
                        {[
                            { key: 'all', label: t('all'), count: base.length, dot: null },
                            { key: 'active', label: t('active'), count: activeCount, dot: '#22c55e' },
                            { key: 'suspended', label: t('suspended'), count: suspendedCount, dot: '#ef4444' },
                            { key: 'pending', label: t('pending'), count: pendingCount, dot: '#f59e0b' },
                        ].map(f => (
                            <button key={f.key} onClick={() => setStatusFilter(f.key)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all border ${statusFilter === f.key
                                    ? 'border-white/20 bg-white/10 text-white'
                                    : 'bg-white/3 border-white/8 text-slate-400 hover:text-white'
                                    }`}>
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
                        {colorBy === 'status'
                            ? <ToggleRight size={14} className="text-brand-neon-cyan" />
                            : <ToggleLeft size={14} />}
                        {t('colorBy')}: <strong className="text-white">{colorBy === 'status' ? t('colorByStatus') : t('colorByPlan')}</strong>
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
                            <p className="text-sm text-slate-500">{t('noBusinesses')}</p>
                        </div>
                    ) : (
                        <BusinessMap
                            points={filtered}
                            center={center}
                            zoom={zoom}
                            colorBy={colorBy}
                            onSelect={(id) => setSelectedId(id)}
                        />
                    )}

                    {/* Floating legend */}
                    <div className="absolute bottom-8 right-3 z-[1000] bg-white/95 backdrop-blur shadow-lg border border-slate-200 rounded-xl px-3 py-2.5 flex flex-col gap-1.5 text-[11px]">
                        <p className="text-slate-400 font-semibold uppercase tracking-wider text-[9px] mb-0.5">
                            {colorBy === 'status' ? t('byStatus') : t('byPlan')}
                        </p>
                        {legend.map(l => (
                            <span key={l.key} className="flex items-center gap-2 text-slate-700">
                                <span className="w-3 h-3 rounded-full shrink-0 border-2 border-white shadow"
                                    style={{ background: l.dot, boxShadow: `0 0 5px ${l.dot}88` }} />
                                {l.label}
                            </span>
                        ))}
                    </div>

                    {/* Click hint */}
                    {!selectedId && !loading && filtered.length > 0 && (
                        <div className="absolute bottom-8 left-4 z-[1000] bg-black/60 backdrop-blur text-white text-xs px-3 py-1.5 rounded-full">
                            {t('clickHint')}
                        </div>
                    )}
                </div>
            </div>

            <BusinessPreviewPanel
                businessId={selectedId}
                onClose={() => setSelectedId(null)}
            />
        </>
    );
}
