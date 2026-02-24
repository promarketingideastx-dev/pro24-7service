'use client';

import { useEffect, useRef } from 'react';

export interface MapPoint {
    id?: string;
    lat: number;
    lng: number;
    name: string;
    city?: string;
    country?: string;
    plan?: string;
    planSource?: string;
    category?: string;
    status?: string;
    suspended?: boolean;
    coverImage?: string;
}

type ColorBy = 'status' | 'plan';

interface BusinessMapProps {
    points: MapPoint[];
    center?: [number, number];
    zoom?: number;
    colorBy?: ColorBy;
    onSelect?: (id: string, point: MapPoint) => void;
}

const STATUS_COLOR: Record<string, string> = {
    active: '#22c55e',
    suspended: '#ef4444',
    pending: '#f59e0b',
    default: '#60a5fa',
};

const PLAN_COLOR: Record<string, string> = {
    free: '#94a3b8',
    premium: '#60a5fa',
    plus_team: '#a78bfa',
    vip: '#fbbf24',
};

function getStatusColor(p: MapPoint): string {
    if (p.suspended || p.status === 'suspended') return STATUS_COLOR.suspended;
    if (p.status === 'pending') return STATUS_COLOR.pending;
    return STATUS_COLOR.active;
}

function getColor(p: MapPoint, colorBy: ColorBy): string {
    if (colorBy === 'plan') return PLAN_COLOR[p.plan ?? 'free'] ?? PLAN_COLOR.free;
    return getStatusColor(p);
}

function categoryEmoji(cat?: string): string {
    if (!cat) return '🏢';
    const c = cat.toLowerCase();
    if (c.includes('health') || c.includes('salud')) return '🏥';
    if (c.includes('food') || c.includes('food') || c.includes('aliment')) return '🍽️';
    if (c.includes('beauty') || c.includes('wellness') || c.includes('belleza')) return '💅';
    if (c.includes('tech') || c.includes('tecnolog')) return '💻';
    if (c.includes('art') || c.includes('design') || c.includes('diseño')) return '🎨';
    if (c.includes('gym') || c.includes('fitness') || c.includes('sport')) return '💪';
    if (c.includes('edu') || c.includes('school') || c.includes('acad')) return '📚';
    if (c.includes('legal') || c.includes('law')) return '⚖️';
    return '💼';
}

export default function BusinessMap({ points, center = [14.5, -86.5], zoom = 7, colorBy = 'status', onSelect }: BusinessMapProps) {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<any>(null);

    useEffect(() => {
        if (typeof window === 'undefined' || !mapRef.current) return;

        let mounted = true;

        (async () => {
            const L = (await import('leaflet')).default;
            if (!mounted || !mapRef.current) return;

            // Remove existing map
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }

            const map = L.map(mapRef.current, {
                center,
                zoom,
                zoomControl: true,
                attributionControl: true,
            });

            // CartoDB Voyager tiles (Google Maps style)
            L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
                attribution: '© OpenStreetMap contributors © CARTO',
                subdomains: 'abcd',
                maxZoom: 20,
            }).addTo(map);

            mapInstanceRef.current = map;

            // Add markers
            points.forEach(p => {
                const color = getColor(p, colorBy);
                const emoji = categoryEmoji(p.category);
                const statusColor = getStatusColor(p);
                const plan = p.plan?.toUpperCase() ?? 'FREE';
                const statusLabel = p.suspended || p.status === 'suspended' ? 'Suspendido' : p.status === 'pending' ? 'Pendiente' : 'Activo';

                // Marker: emoji icon with animated ripple — same as landing style
                const icon = L.divIcon({
                    className: '',
                    html: `
                        <div style="position:relative; width:42px; height:42px; cursor:pointer;">
                            <!-- Ripple animation -->
                            <div style="
                                position:absolute; inset:0;
                                border-radius:50%;
                                background:${color}30;
                                animation:mapPulse 2s ease-out infinite;
                            "></div>
                            <div style="
                                position:absolute; inset:3px;
                                border-radius:50%;
                                background:${color}50;
                                animation:mapPulse 2s ease-out infinite 0.4s;
                            "></div>
                            <!-- Icon circle -->
                            <div style="
                                position:absolute; top:50%; left:50%; transform:translate(-50%,-50%);
                                width:28px; height:28px;
                                background:white;
                                border-radius:50%;
                                border:2.5px solid ${color};
                                box-shadow:0 2px 8px ${color}88, 0 1px 3px rgba(0,0,0,0.2);
                                display:flex; align-items:center; justify-content:center;
                                font-size:14px; line-height:1;
                                overflow:hidden;
                            ">${p.coverImage
                            ? `<img src="${p.coverImage}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" onerror="this.style.display='none';this.nextSibling.style.display='flex';"/><span style="display:none;width:100%;height:100%;align-items:center;justify-content:center;">${emoji}</span>`
                            : emoji
                        }</div>
                            <!-- Crown badge for VIP collaborators -->
                            ${p.planSource === 'collaborator_beta' ? `
                            <div style="
                                position:absolute; top:-2px; right:-2px;
                                width:16px; height:16px;
                                background:#fbbf24;
                                border-radius:50%;
                                border:1.5px solid white;
                                box-shadow:0 1px 4px rgba(0,0,0,0.25);
                                display:flex; align-items:center; justify-content:center;
                                font-size:9px; line-height:1;
                            ">👑</div>` : ''}
                        </div>
                        <style>
                            @keyframes mapPulse {
                                0%   { transform:scale(0.4); opacity:0.8; }
                                100% { transform:scale(1.6); opacity:0; }
                            }
                        </style>`,

                    iconSize: [42, 42],
                    iconAnchor: [21, 21],
                    popupAnchor: [0, -22],
                });

                L.marker([p.lat, p.lng], { icon })
                    .addTo(map)
                    .on('click', () => {
                        if (onSelect && p.id) onSelect(p.id, p);
                    })
                    .bindTooltip(`
                        <div style="font-family:system-ui;padding:4px 2px;">
                            <strong style="font-size:13px;color:#111;">${p.name}</strong><br/>
                            <span style="font-size:11px;color:#6b7280;">${p.city ?? ''}${p.city && p.country ? ', ' : ''}${p.country ?? ''}</span>
                        </div>`, { direction: 'top', offset: [0, -26], opacity: 1 });
            });
        })();

        return () => {
            mounted = false;
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, [points, center, zoom, colorBy]);

    return (
        <>
            <style>{`
                .leaflet-popup-content-wrapper {
                    border-radius: 12px !important;
                    box-shadow: 0 8px 24px rgba(0,0,0,0.12) !important;
                    border: 1px solid #e5e7eb !important;
                    padding: 0 !important;
                }
                .leaflet-popup-content { margin: 12px 14px !important; }
                .leaflet-popup-close-button { top: 8px !important; right: 10px !important; color: #9ca3af !important; font-size: 16px !important; }
                .leaflet-popup-tip-container { opacity: 0.7; }
                .leaflet-control-zoom a {
                    background: white !important; color: #374151 !important;
                    border-color: #e5e7eb !important; border-radius: 6px !important;
                    font-size: 16px !important;
                }
                .leaflet-control-zoom a:hover { background: #f9fafb !important; color: #111 !important; }
                .leaflet-control-attribution { font-size: 9px !important; background: rgba(255,255,255,0.7) !important; }
            `}</style>
            <div ref={mapRef} className="w-full h-full" />
        </>
    );
}

export { STATUS_COLOR, PLAN_COLOR };
