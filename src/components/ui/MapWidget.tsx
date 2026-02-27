'use client';

import { useEffect, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents, GeoJSON } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useTranslations } from 'next-intl';
import { BusinessMock } from '@/data/mockBusinesses';
import { COUNTRIES, CountryCode } from '@/lib/locations';


// ── Country borders overlay ──────────────────────────────────────────────────
// Draws dark border lines on top of CARTO tiles so countries are clearly
// separated — no fill, no labels, just visible dividing lines.
function CountryBordersLayer() {
    const [geoData, setGeoData] = useState<any>(null);

    useEffect(() => {
        fetch('https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson')
            .then(r => r.json())
            .then(data => setGeoData(data))
            .catch(() => { /* ignore if offline */ });
    }, []);

    if (!geoData) return null;

    return (
        <GeoJSON
            key="country-borders"
            data={geoData}
            style={() => ({
                color: '#94a3b8',   // slate-400 — subtle but visible
                weight: 0.8,
                opacity: 0.55,
                fillOpacity: 0,
            })}
            onEachFeature={(_feature, layer) => { layer.off(); }}
        />
    );
}

interface MapWidgetProps {
    businesses: BusinessMock[];
    selectedBusiness?: BusinessMock | null;
    onBusinessSelect?: (business: BusinessMock) => void;
    onNavigate?: (business: BusinessMock) => void;
    isAuthenticated?: boolean;
    countryCoordinates?: { lat: number; lng: number; zoom: number };
    countryCode?: string;
    expanded?: boolean; // triggers invalidateSize after CSS transition
}

// ── MapResizer: calls invalidateSize after container CSS transition ends ──────
function MapResizer({ expanded }: { expanded?: boolean }) {
    const map = useMap();
    useEffect(() => {
        // 560ms > 500ms transition — ensures tiles fill the new container
        const timer = setTimeout(() => map.invalidateSize(), 560);
        return () => clearTimeout(timer);
    }, [expanded, map]);
    return null;
}

function MapUpdater({ businesses, selectedBusiness, countryCoordinates, countryCode }: {
    businesses: BusinessMock[],
    selectedBusiness?: BusinessMock | null,
    countryCoordinates?: { lat: number; lng: number; zoom: number },
    countryCode?: string,
}) {
    const map = useMap();

    useEffect(() => {
        if (selectedBusiness) return; // handled by the other effect

        if (countryCoordinates) {
            // Explicit coordinates passed — use them (country-level zoom)
            map.flyTo(
                [countryCoordinates.lat, countryCoordinates.lng],
                countryCoordinates.zoom,
                { animate: true, duration: 2.0, easeLinearity: 0.25 }
            );
        } else if (countryCode && COUNTRIES[countryCode as CountryCode]) {
            // Derive from COUNTRIES registry — never fall back to hardcoded coords
            const cfg = COUNTRIES[countryCode as CountryCode];
            map.flyTo(
                [cfg.coordinates.lat, cfg.coordinates.lng],
                cfg.coordinates.zoom,
                { animate: true, duration: 2.0, easeLinearity: 0.25 }
            );
        }
        // If neither is available, do NOT move the map
    }, [businesses, map, selectedBusiness, countryCoordinates, countryCode]);

    useEffect(() => {
        if (selectedBusiness) {
            map.flyTo([selectedBusiness.lat, selectedBusiness.lng], 15, {
                animate: true,
                duration: 1.5
            });
        }
    }, [selectedBusiness, map]);

    return null;
}

// Tap empty map area → zoom in one level at that point
function TapToZoom() {
    useMapEvents({
        click(e) {
            const map = e.target;
            map.setView(e.latlng, Math.min(map.getZoom() + 1, 18), {
                animate: true,
                duration: 0.4,
            });
        },
    });
    return null;
}

const createCustomIcon = (icon: any, colorClass: string, logoUrl?: string | null) => {
    const iconContent = typeof icon === 'string' ? icon : '?';
    const innerContent = logoUrl
        ? `<img
            src="${logoUrl}"
            alt=""
            style="width:100%;height:100%;object-fit:cover;border-radius:50%;"
            onerror="this.style.display='none';this.nextSibling.style.display='flex';"
          /><span style="display:none;width:100%;height:100%;align-items:center;justify-content:center;font-size:14px;">${iconContent}</span>`
        : `<span style="font-size:14px;">${iconContent}</span>`;

    return L.divIcon({
        className: 'custom-pin',
        html: `
            <div class="relative flex items-center justify-center w-10 h-10 transform -translate-x-1/2 -translate-y-1/2">
                <div class="absolute inset-0 rounded-full ${colorClass} opacity-50 animate-ping"></div>
                <div class="relative w-8 h-8 rounded-full ${colorClass} border-2 border-white shadow-lg flex items-center justify-center overflow-hidden">
                    ${innerContent}
                </div>
                <div class="absolute top-full mt-1 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-white"></div>
            </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
        popupAnchor: [0, -20]
    });
};

const createClusterIcon = (count: number) => {
    const size = count > 50 ? 52 : count > 10 ? 44 : 36;
    return L.divIcon({
        className: 'cluster-pin',
        html: `
            <div style="
                width:${size}px;height:${size}px;
                border-radius:50%;
                background:rgba(20,184,166,0.15);
                border:2px solid rgba(20,184,166,0.7);
                display:flex;align-items:center;justify-content:center;
                transform:translate(-50%,-50%);
                box-shadow:0 0 0 4px rgba(20,184,166,0.10);
                backdrop-filter:blur(4px);
            ">
                <span style="
                    color:#0F766E;
                    font-weight:800;
                    font-size:${count > 99 ? 10 : 13}px;
                    font-family:system-ui,sans-serif;
                    letter-spacing:-0.5px;
                ">${count > 99 ? '99+' : count}</span>
            </div>
        `,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
        popupAnchor: [0, -(size / 2)],
    });
};

// ── Cluster logic: groups businesses by pixel proximity ──────────────────────
interface ClusterItem {
    type: 'single';
    business: BusinessMock;
    position: [number, number];
}
interface ClusterGroup {
    type: 'cluster';
    count: number;
    businesses: BusinessMock[];
    center: [number, number];
}
type ClusterResult = ClusterItem | ClusterGroup;

function computeClusters(
    businesses: BusinessMock[],
    map: L.Map,
    getPosition: (lat: number, lng: number) => [number, number],
    clusterRadiusPx = 60
): ClusterResult[] {
    const used = new Set<number>();
    const results: ClusterResult[] = [];

    for (let i = 0; i < businesses.length; i++) {
        if (used.has(i)) continue;
        const biz = businesses[i];
        const pos = getPosition(biz.lat, biz.lng);
        const pointI = map.latLngToContainerPoint(pos);

        const group: number[] = [i];
        for (let j = i + 1; j < businesses.length; j++) {
            if (used.has(j)) continue;
            const pos2 = getPosition(businesses[j].lat, businesses[j].lng);
            const pointJ = map.latLngToContainerPoint(pos2);
            const dx = pointI.x - pointJ.x;
            const dy = pointI.y - pointJ.y;
            if (Math.sqrt(dx * dx + dy * dy) <= clusterRadiusPx) {
                group.push(j);
            }
        }

        group.forEach(idx => used.add(idx));

        if (group.length === 1) {
            results.push({ type: 'single', business: biz, position: pos });
        } else {
            const members = group.map(idx => businesses[idx]);
            const avgLat = members.reduce((s, b) => s + b.lat, 0) / members.length;
            const avgLng = members.reduce((s, b) => s + b.lng, 0) / members.length;
            const center = getPosition(avgLat, avgLng);
            results.push({ type: 'cluster', count: members.length, businesses: members, center });
        }
    }
    return results;
}

// ── ClusterLayer: reactive to zoom/pan changes ───────────────────────────────
function ClusterLayer({
    businesses,
    onBusinessSelect,
    onNavigate,
    isAuthenticated,
    countryBounds,
    t,
}: {
    businesses: BusinessMock[];
    onBusinessSelect?: (b: BusinessMock) => void;
    onNavigate?: (b: BusinessMock) => void;
    isAuthenticated: boolean;
    countryBounds?: [number, number, number, number];
    t: (key: string) => string;
}) {
    const map = useMap();
    const [zoom, setZoom] = useState(map.getZoom());

    useMapEvents({
        zoomend() { setZoom(map.getZoom()); },
        moveend() { setZoom(z => z); }, // trigger re-cluster on pan
    });

    const getPosition = useCallback((lat: number, lng: number): [number, number] => {
        if (!countryBounds) return [lat, lng];
        const [minLat, minLng, maxLat, maxLng] = countryBounds;
        const MARGIN = 0.05;
        let newLat = lat;
        let newLng = lng;
        if (lat < minLat && lat >= minLat - MARGIN) newLat = minLat + 0.0001;
        else if (lat > maxLat && lat <= maxLat + MARGIN) newLat = maxLat - 0.0001;
        if (lng < minLng && lng >= minLng - MARGIN) newLng = minLng + 0.0001;
        else if (lng > maxLng && lng <= maxLng + MARGIN) newLng = maxLng - 0.0001;
        return [newLat, newLng];
    }, [countryBounds]);

    // Cluster at zoom < 15; individual pins at 15+
    const CLUSTER_THRESHOLD = 15;
    const items = zoom < CLUSTER_THRESHOLD
        ? computeClusters(businesses, map, getPosition)
        : businesses.map(b => ({ type: 'single' as const, business: b, position: getPosition(b.lat, b.lng) }));

    return (
        <>
            {items.map((item, idx) => {
                if (item.type === 'cluster') {
                    return (
                        <Marker
                            key={`cluster-${idx}`}
                            position={item.center}
                            icon={createClusterIcon(item.count)}
                            eventHandlers={{
                                click: () => {
                                    map.flyTo(item.center, Math.min(map.getZoom() + 2, 18), {
                                        animate: true, duration: 0.8
                                    });
                                }
                            }}
                        />
                    );
                }

                const biz = item.business;
                return (
                    <Marker
                        key={biz.id}
                        position={item.position}
                        icon={createCustomIcon(biz.icon, biz.color, (biz as any).logoUrl)}
                        eventHandlers={{
                            click: () => { if (onBusinessSelect) onBusinessSelect(biz); }
                        }}
                    >
                        <Popup className="custom-popup" closeButton={false} minWidth={140} maxWidth={180}>
                            <div className="p-1 min-w-[140px] flex flex-col gap-1.5 text-center">
                                <div>
                                    <h3 className="font-bold text-slate-900 text-xs leading-none line-clamp-1">{biz.name}</h3>
                                    <p className="text-[10px] text-slate-500 font-medium mt-0.5">{biz.subcategory}</p>
                                </div>
                                {isAuthenticated && (
                                    <p className="text-[10px] text-slate-400 line-clamp-1 hidden sm:block leading-tight">{biz.description}</p>
                                )}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (onNavigate) onNavigate(biz);
                                    }}
                                    className={`w-full text-[10px] font-bold py-1 px-2 rounded transition-colors flex items-center justify-center gap-1
                                    ${isAuthenticated
                                            ? 'bg-slate-900 text-white hover:bg-slate-800'
                                            : 'bg-brand-neon-cyan/10 text-brand-dark-blue hover:bg-brand-neon-cyan/20 border border-brand-neon-cyan/20'}`}
                                >
                                    {isAuthenticated ? t('viewProfile') : t('view')}
                                    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
                                </button>
                            </div>
                        </Popup>
                    </Marker>
                );
            })}
        </>
    );
}

export default function MapWidget({
    businesses,
    selectedBusiness,
    onBusinessSelect,
    onNavigate,
    isAuthenticated = false,
    countryCoordinates,
    countryCode,
    expanded,
}: MapWidgetProps) {
    const [isMounted, setIsMounted] = useState(false);
    const t = useTranslations('map');

    const activeCountry = countryCode ? COUNTRIES[countryCode as CountryCode] : null;
    const countryBounds = activeCountry?.bounds as [number, number, number, number] | undefined;

    useEffect(() => {
        setIsMounted(true);
    }, []);

    if (!isMounted) return <div className="h-64 w-full bg-slate-100 rounded-3xl animate-pulse flex items-center justify-center text-slate-400">{t('loading')}</div>;

    // Derive the map starting position from the country registry — never hardcode Honduras
    const countryFromRegistry = countryCode ? COUNTRIES[countryCode as CountryCode] : null;
    const resolvedCoords = countryCoordinates ?? countryFromRegistry?.coordinates;

    // Initial zoom: use country zoom directly (not derived), so the country is fully visible
    const startZoom = resolvedCoords?.zoom ?? 6;
    const defaultPosition: [number, number] = resolvedCoords
        ? [resolvedCoords.lat, resolvedCoords.lng]
        : [14.0818, -87.2068]; // Only absolute last resort: HN center (not capital)

    return (
        <MapContainer
            center={defaultPosition}
            zoom={startZoom}
            scrollWheelZoom={false}
            className="h-full w-full rounded-3xl z-0"
            style={{ height: '100%', width: '100%', filter: 'saturate(2.6) hue-rotate(5deg) brightness(0.97) contrast(1.05)' }}
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            />
            {/* Country borders overlay */}
            <CountryBordersLayer />
            <TapToZoom />
            <MapResizer expanded={expanded} />
            <MapUpdater businesses={businesses} selectedBusiness={selectedBusiness} countryCoordinates={countryCoordinates} countryCode={countryCode} />

            <ClusterLayer
                businesses={businesses}
                onBusinessSelect={onBusinessSelect}
                onNavigate={onNavigate}
                isAuthenticated={isAuthenticated}
                countryBounds={countryBounds}
                t={t}
            />
        </MapContainer>
    );
}
