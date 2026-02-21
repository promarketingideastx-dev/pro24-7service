'use client';

import { useEffect, useRef, useState } from 'react';

interface MapPoint {
    lat: number;
    lng: number;
    name: string;
    city?: string;
    country?: string;
    plan?: string;
    category?: string;
}

interface BusinessMapProps {
    points: MapPoint[];
    center?: [number, number];
    zoom?: number;
}

const PLAN_COLOR: Record<string, string> = {
    free: '#94a3b8',
    premium: '#60a5fa',
    plus_team: '#a78bfa',
    vip: '#fbbf24',
};

export default function BusinessMap({ points, center = [14.5, -86.5], zoom = 6 }: BusinessMapProps) {
    const mapRef = useRef<any>(null);
    const mapInstanceRef = useRef<any>(null);
    const markersRef = useRef<any[]>([]);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const initMap = async () => {
            const L = (await import('leaflet')).default;

            // Fix default icon paths
            delete (L.Icon.Default.prototype as any)._getIconUrl;
            L.Icon.Default.mergeOptions({
                iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
                iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
                shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
            });

            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
            }

            const map = L.map(mapRef.current!, {
                center,
                zoom,
                zoomControl: true,
            });

            // Dark tile layer
            L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
                attribution: '© OpenStreetMap contributors © CARTO',
                subdomains: 'abcd',
                maxZoom: 19,
            }).addTo(map);

            mapInstanceRef.current = map;

            // Add markers
            markersRef.current.forEach(m => m.remove());
            markersRef.current = [];

            points.forEach(p => {
                const color = PLAN_COLOR[p.plan ?? 'free'] ?? '#94a3b8';

                const icon = L.divIcon({
                    className: '',
                    html: `<div style="
                        width: 14px; height: 14px;
                        border-radius: 50%;
                        background: ${color};
                        border: 2px solid rgba(255,255,255,0.4);
                        box-shadow: 0 0 8px ${color}88;
                    "></div>`,
                    iconSize: [14, 14],
                    iconAnchor: [7, 7],
                });

                const marker = L.marker([p.lat, p.lng], { icon })
                    .addTo(map)
                    .bindPopup(`
                        <div style="font-family: system-ui; font-size: 13px; color: #fff; background: #0f1a2e; border-radius: 8px; padding: 8px 10px; min-width: 140px;">
                            <strong style="color: ${color}">${p.name}</strong><br/>
                            <span style="color: #64748b">${p.city ?? ''} ${p.country ?? ''}</span><br/>
                            <span style="color: ${color}; font-size: 11px">${p.plan?.toUpperCase() ?? 'FREE'}</span>
                        </div>
                    `, {
                        className: 'dark-popup',
                    });

                markersRef.current.push(marker);
            });
        };

        initMap();

        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, [points, center, zoom]);

    return (
        <>
            <style>{`
                .leaflet-popup-content-wrapper { background: #0f1a2e !important; border: 1px solid rgba(255,255,255,0.1) !important; box-shadow: 0 8px 32px rgba(0,0,0,0.5) !important; color: #fff !important; border-radius: 12px !important; }
                .leaflet-popup-tip { background: #0f1a2e !important; }
                .leaflet-popup-close-button { color: #64748b !important; }
                .leaflet-container { font-family: system-ui; }
                .leaflet-control-zoom a { background: #0a1128 !important; color: #94a3b8 !important; border-color: rgba(255,255,255,0.1) !important; }
                .leaflet-control-zoom a:hover { background: #0f1a2e !important; color: #00f0ff !important; }
                .leaflet-control-attribution { background: rgba(0,0,0,0.5) !important; color: #475569 !important; font-size: 9px !important; }
            `}</style>
            <div ref={mapRef} className="w-full h-full rounded-xl" />
        </>
    );
}
