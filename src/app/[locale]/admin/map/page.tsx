'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { useAdminContext } from '@/context/AdminContext';
import { onSnapshot, query, collection, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Map, ToggleLeft, ToggleRight, Filter } from 'lucide-react';
import { toast } from 'sonner';
import 'leaflet/dist/leaflet.css';
import type { MapPoint } from '@/components/admin/BusinessMap';
import BusinessPreviewPanel from '@/components/admin/BusinessPreviewPanel';
import UserPreviewPanel from '@/components/admin/UserPreviewPanel';

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
        { key: 'client', label: t('filterClient') || 'Client', dot: '#3b82f6' },
        { key: 'provider', label: t('filterProvider') || 'Provider', dot: '#10b981' },
        { key: 'expired', label: t('filterTrialExpired') || 'Trial Expired', dot: '#9ca3af' },
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
    const [loadingBiz, setLoadingBiz] = useState(true);
    const [loadingUsr, setLoadingUsr] = useState(true);
    
    // UI selection
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [selectedType, setSelectedType] = useState<'business' | 'user' | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    // Filters
    // 1. Entities
    const [showBusinesses, setShowBusinesses] = useState(true);
    const [showClients, setShowClients] = useState(false);
    const [showProviders, setShowProviders] = useState(false);
    // 2. Attributes (Stackable overlays)
    const [filterVip, setFilterVip] = useState(false);
    const [filterTrialExpired, setFilterTrialExpired] = useState(false);

    // ── Real-time Firestore listeners ──
    useEffect(() => {
        setLoadingBiz(true);
        setLoadingUsr(true);

        const activeBizIds = new Set<string>();

        // Listener 1: Businesses
        const qBiz = query(collection(db, 'businesses_public'), limit(500));
        const unsubBiz = onSnapshot(qBiz, (snap) => {
            const pts: MapPoint[] = [];
            snap.docs.forEach((d) => {
                const data = d.data();
                activeBizIds.add(d.id);

                let lat = data.location?.lat ?? data.lat;
                let lng = data.location?.lng ?? data.lng;

                // Fallback for business
                if (!lat || !lng || lat === 0 || lng === 0) {
                    const fb = getDeptCoords(data.department, data.country);
                    if (fb) { [lat, lng] = fb; } 
                    else {
                        const cc = (data.country || 'HN').toUpperCase();
                        [lat, lng] = COUNTRY_CENTER[cc] ?? COUNTRY_CENTER.ALL;
                    }
                }

                const plan = data.planData?.plan ?? 'free';
                const planSource = data.planData?.planSource;
                const isVip = plan === 'vip' || planSource === 'collaborator_beta';
                
                let isTrialExpired = data.planData?.planStatus === 'expired';
                if (data.planData?.trialEndDate) {
                    const trialEndMs = data.planData.trialEndDate.toMillis 
                        ? data.planData.trialEndDate.toMillis() 
                        : (typeof data.planData.trialEndDate === 'number' ? data.planData.trialEndDate : data.planData.trialEndDate.seconds * 1000);
                    if (trialEndMs && trialEndMs < Date.now()) isTrialExpired = true;
                }

                pts.push({
                    id: d.id,
                    type: 'business',
                    lat, lng,
                    name: data.name ?? '—',
                    city: data.city,
                    country: data.country,
                    plan: plan,
                    planSource: planSource,
                    category: data.category,
                    status: data.status ?? 'active',
                    suspended: data.suspended === true,
                    coverImage: data.logoUrl || data.coverImage || undefined,
                    isVip,
                    isTrialExpired,
                });
            });

            setAllPoints(prev => {
                const nonBiz = prev.filter(p => p.type !== 'business');
                return [...pts, ...nonBiz];
            });
            setLastUpdated(new Date());
            setLoadingBiz(false);
        }, () => {
            toast.error('Error cargando negocios');
            setLoadingBiz(false);
        });

        // Listener 2: Users
        const qUsr = query(collection(db, 'users'), limit(500));
        const unsubUsr = onSnapshot(qUsr, (snap) => {
            const pts: MapPoint[] = [];
            snap.docs.forEach((d) => {
                const data = d.data();
                
                // CRITICAL: Deduplication. If user is provider and has an active business, 
                // the business map already shows them. We skip user render to avoid duplicates.
                if (data.roles?.provider === true && data.isBusinessActive === true && data.businessProfileId) {
                    return; 
                }

                const loc = data.userLocation;
                // CRITICAL: Strict requirement. No fallback coords for users! If missing, they don't map.
                if (!loc || !loc.lat || !loc.lng || loc.lat === 0 || loc.lng === 0) {
                    return;
                }

                // VIP Source of truth
                const isVip = data.isVip === true || data.subscription?.plan === 'vip' || data.selectedPlan === 'vip';
                
                // Trial Expired Source of truth
                const subStatus = data.subscription?.status || 'active';
                const isTrialExpired = subStatus === 'expired' || (data.subscription?.trialEndAt && data.subscription.trialEndAt < Date.now());

                pts.push({
                    id: d.id,
                    type: 'user',
                    lat: loc.lat, 
                    lng: loc.lng,
                    name: data.displayName || data.clientProfile?.fullName || data.email || '—',
                    country: data.country_code || loc.countryCode || 'HN',
                    userRole: data.roles?.provider ? 'provider' : 'client',
                    isVip: isVip,
                    isTrialExpired: isTrialExpired === true,
                });
            });

            setAllPoints(prev => {
                const bizOnly = prev.filter(p => p.type === 'business');
                return [...bizOnly, ...pts];
            });
            setLastUpdated(new Date());
            setLoadingUsr(false);
        }, () => {
            toast.error('Error cargando usuarios');
            setLoadingUsr(false);
        });

        return () => { unsubBiz(); unsubUsr(); };
    }, []);

    useEffect(() => {
        let pts = allPoints;
        
        // 1. Geographic isolation
        if (selectedCountry !== 'ALL') {
            pts = pts.filter(p => p.country === selectedCountry);
        }

        // 2. Entity Type Filters & Independent Modifiers Overlays
        pts = pts.filter(p => {
            let matchesType = false;
            
            // Base layer checks
            if (p.type === 'business' && showBusinesses) matchesType = true;
            if (p.type === 'user' && p.userRole === 'client' && showClients) matchesType = true;
            if (p.type === 'user' && p.userRole === 'provider' && showProviders) matchesType = true;

            // Opción A: auto-incluir temporalmente capas relevantes si coincide con el filtro activo
            if (filterVip && p.isVip) matchesType = true;
            if (filterTrialExpired && p.isTrialExpired) matchesType = true;

            return matchesType;
        });

        // 3. Attribute Filters (VIP / Trial Expired)
        if (filterVip || filterTrialExpired) {
            pts = pts.filter(p => {
                // If any modifier is active, the point must match at least one of the active modifiers
                // This ensures VIP + Trial behave as an independent union overlay, not a strict intersection.
                if (filterVip && p.isVip) return true;
                if (filterTrialExpired && p.isTrialExpired) return true;
                return false;
            });
        }

        setFiltered(pts);
    }, [allPoints, selectedCountry, showBusinesses, showClients, showProviders, filterVip, filterTrialExpired]);

    const activeCount = filtered.length;
    const center: [number, number] = COUNTRY_CENTER[selectedCountry] ?? COUNTRY_CENTER.ALL;
    const zoom = COUNTRY_ZOOM[selectedCountry] ?? 5;
    const legend = colorBy === 'status' ? STATUS_LEGEND : PLAN_LEGEND;
    const isLoading = loadingBiz || loadingUsr;

    const toggleAllEntities = () => {
        const anyOff = !showBusinesses || !showClients || !showProviders;
        setShowBusinesses(anyOff);
        setShowClients(anyOff);
        setShowProviders(anyOff);
        if (anyOff) {
            setFilterVip(false);
            setFilterTrialExpired(false);
        }
    };

    return (
        <>
            <div className="flex flex-col gap-3" style={{ height: 'calc(100vh - 110px)' }}>

                {/* ── Header ── */}
                <div className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="mr-2">
                        <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                            <Map size={20} className="text-[#14B8A6]" />
                            {t('title') || 'CRM Visual Map'}
                            {/* Live indicator */}
                            <span className="flex items-center gap-1.5 text-[10px] font-normal text-green-400 bg-green-400/10 border border-green-400/20 px-2 py-0.5 rounded-full">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                                Live
                            </span>
                        </h1>
                        <p className="text-[11px] text-slate-500">
                            {activeCount} {t('businesses') || 'entidades'}
                            {selectedCountry !== 'ALL' && ` · ${selectedCountry}`}
                        </p>
                    </div>

                    <div className="h-8 w-px bg-slate-200 mx-1 hidden sm:block"></div>

                    {/* Types Filters */}
                    <div className="flex gap-1.5 flex-wrap">
                        <button onClick={toggleAllEntities}
                            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">
                            {t('filterTodos') || 'Todos'}
                        </button>
                        <button onClick={() => setShowBusinesses(!showBusinesses)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all border ${showBusinesses ? 'border-[#14B8A6] bg-[#14B8A6] text-white' : 'bg-white border-slate-200 text-slate-500'}`}>
                            {t('filterNegocios') || 'Negocios'}
                        </button>
                        <button onClick={() => setShowClients(!showClients)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all border ${showClients ? 'border-blue-500 bg-blue-500 text-white' : 'bg-white border-slate-200 text-slate-500'}`}>
                            {t('filterClient') || 'Clientes'}
                        </button>
                        <button onClick={() => setShowProviders(!showProviders)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all border ${showProviders ? 'border-emerald-500 bg-emerald-500 text-white' : 'bg-white border-slate-200 text-slate-500'}`}>
                            {t('filterProvider') || 'Proveedores'}
                        </button>
                    </div>

                    <div className="h-8 w-px bg-slate-200 mx-1 hidden sm:block"></div>

                    {/* Attributes Filters */}
                    <div className="flex gap-1.5 flex-wrap">
                        <button onClick={() => setFilterVip(!filterVip)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${filterVip ? 'border-amber-500 bg-amber-500 text-white shadow-md shadow-amber-500/20' : 'bg-white border-amber-200 text-amber-600'}`}>
                            👑 {t('filterVip') || 'VIP'}
                        </button>
                        <button onClick={() => setFilterTrialExpired(!filterTrialExpired)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${filterTrialExpired ? 'border-red-500 bg-red-500 text-white shadow-md shadow-red-500/20' : 'bg-white border-slate-200 text-slate-500'}`}>
                            ⚠️ {t('filterTrialExpired') || 'Trial Expirado'}
                        </button>
                    </div>

                    {/* ColorBy toggle */}
                    <div className="ml-auto">
                        <button onClick={() => setColorBy(c => c === 'status' ? 'plan' : 'status')}
                            className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-xl text-xs text-slate-600 transition-colors">
                            {colorBy === 'status' ? <ToggleRight size={14} className="text-[#14B8A6]" /> : <ToggleLeft size={14} />}
                            {t('colorBy')}: <strong className="text-slate-900">{colorBy === 'status' ? t('colorByStatus') : t('colorByPlan')}</strong>
                        </button>
                    </div>
                </div>

                {/* ── Map ── */}
                <div className="flex-1 border border-slate-200 rounded-2xl overflow-hidden relative shadow-lg">
                    {isLoading && filtered.length === 0 ? (
                        <div className="flex items-center justify-center h-full bg-slate-100">
                            <div className="flex flex-col items-center gap-3">
                                <div className="w-8 h-8 border-2 border-[#14B8A6]/30 border-t-[#14B8A6] rounded-full animate-spin" />
                                <p className="text-sm font-medium text-slate-500">Escaneando base de datos mundial...</p>
                            </div>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full bg-slate-100 gap-2 p-6 text-center">
                            <Map size={32} className="text-slate-300" />
                            <p className="text-sm text-slate-600 font-semibold">{t('noResults') || 'No hay resultados con los filtros actuales'}</p>
                            <p className="text-xs text-slate-400 max-w-sm">
                                Verifica si has seleccionado un país donde estos datos existan o si la combinación de filtros devuelve un estado vacío.
                            </p>
                        </div>
                    ) : (
                        <BusinessMap
                            points={filtered}
                            center={center}
                            zoom={zoom}
                            colorBy={colorBy}
                            onSelect={(id, pt) => {
                                setSelectedId(id);
                                setSelectedType(pt.type);
                            }}
                        />
                    )}

                    {/* Floating legend */}
                    <div className="absolute bottom-8 right-3 z-[1000] bg-white/95 backdrop-blur shadow-lg border border-slate-200 rounded-xl px-3 py-2.5 flex flex-col gap-1.5 text-[11px] pointer-events-none">
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
                    {!selectedId && !isLoading && filtered.length > 0 && (
                        <div className="absolute bottom-8 left-4 z-[1000] bg-[#F4F6F8]/60 backdrop-blur text-slate-900 shadow-sm border border-slate-200 text-xs px-3 py-1.5 rounded-full pointer-events-none">
                            {t('clickHint')}
                        </div>
                    )}
                </div>
            </div>

            <BusinessPreviewPanel
                businessId={selectedType === 'business' && selectedId ? selectedId : null}
                onClose={() => { setSelectedId(null); setSelectedType(null); }}
            />

            <UserPreviewPanel 
                userId={selectedType === 'user' && selectedId ? selectedId : null}
                onClose={() => { setSelectedId(null); setSelectedType(null); }}
            />
        </>
    );
}
