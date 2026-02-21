'use client';

import { useEffect, useRef } from 'react';

export interface MapPoint {
    lat: number;
    lng: number;
    name: string;
    city?: string;
    country?: string;
    plan?: string;
    category?: string;
    status?: string;      // 'active' | 'suspended' | etc.
    suspended?: boolean;
}

interface BusinessMapProps {
    points: MapPoint[];
    center?: [number, number];
    zoom?: number;
    colorBy?: 'status' | 'plan';
}

const STATUS_COLOR: Record<string, { fill: string; glow: string; label: string }> = {
    active: { fill: '#22c55e', glow: '#22c55e88', label: 'Activo' },
    suspended: { fill: '#ef4444', glow: '#ef444488', label: 'Suspendido' },
    pending: { fill: '#f59e0b', glow: '#f59e0b88', label: 'Pendiente' },
    default: { fill: '#94a3b8', glow: '#94a3b888', label: 'Desconocido' },
};

const PLAN_COLOR: Record<string, { fill: string; glow: string }> = {
    free: { fill: '#94a3b8', glow: '#94a3b888' },
    premium: { fill: '#60a5fa', glow: '#60a5fa88' },
    plus_team: { fill: '#a78bfa', glow: '#a78bfa88' },
    vip: { fill: '#fbbf24', glow: '#fbbf2488' },
};

function getColor(point: MapPoint, colorBy: 'status' | 'plan') {
    if (colorBy === 'status') {
        if (point.suspended || point.status === 'suspended') return STATUS_COLOR.suspended;
        if (point.status === 'active' || (!point.suspended && point.status !== 'pending')) return STATUS_COLOR.active;
        if (point.status === 'pending') return STATUS_COLOR.pending;
        return STATUS_COLOR.default;
    }
    return PLAN_COLOR[point.plan ?? 'free'] ?? PLAN_COLOR.free;
}

export default function BusinessMap({ points, center = [14.5, -86.5], zoom = 6, colorBy = 'status' }: BusinessMapProps) {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<any>(null);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const initMap = async () => {
            const L = (await import('leaflet')).default;

            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }

            const map = L.map(mapRef.current!, {
                center,
                zoom,
                zoomControl: true,
            });

            // Google Maps-style tiles (CartoDB Voyager)
            L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
                attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions">CARTO</a>',
                subdomains: 'abcd',
                maxZoom: 20,
            }).addTo(map);

            mapInstanceRef.current = map;

            // Add markers
            points.forEach(p => {
                const { fill, glow } = getColor(p, colorBy);
                const plan = p.plan?.toUpperCase() ?? 'FREE';
                const statusLabel = p.suspended || p.status === 'suspended' ? 'Suspendido' : 'Activo';

                const icon = L.divIcon({
                    className: '',
                    html: `<div style="
                        width: 12px; height: 12px;
                        border-radius: 50%;
                        background: ${fill};
                        border: 2px solid white;
                        box-shadow: 0 0 6px ${glow}, 0 1px 3px rgba(0,0,0,0.4);
                        cursor: pointer;
                    "></div>`,
                    iconSize: [12, 12],
                    iconAnchor: [6, 6],
                    popupAnchor: [0, -8],
                });

                L.marker([p.lat, p.lng], { icon })
                    .addTo(map)
                    .bindPopup(`
                        <div style="font-family: system-ui; font-size: 12px; min-width: 160px;">
                            <strong style="font-size: 13px; color: #111">${p.name}</strong><br/>
                            <span style="color: #6b7280">${p.city ?? ''}${p.city && p.country ? ', ' : ''}${p.country ?? ''}</span><br/>
                            <div style="margin-top:6px; display:flex; gap:6px; flex-wrap:wrap;">
                                <span style="background:${fill}22; color:${fill}; border:1px solid ${fill}44; border-radius:99px; padding:1px 8px; font-size:10px; font-weight:600;">${statusLabel}</span>
                                <span style="background:#f3f4f6; color:#374151; border-radius:99px; padding:1px 8px; font-size:10px;">${plan}</span>
                            </div>
                            ${p.category ? `<div style="color:#9ca3af; font-size:10px; margin-top:3px;">${p.category}</div>` : ''}
                        </div>
                    `);
            });
        };

        initMap();

        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, [points, center, zoom, colorBy]);

    return <div ref={mapRef} className="w-full h-full" />;
}

export { STATUS_COLOR, PLAN_COLOR };
