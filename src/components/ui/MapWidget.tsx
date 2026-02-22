'use client';

import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useTranslations } from 'next-intl';
import { BusinessMock } from '@/data/mockBusinesses';
import { COUNTRIES, CountryCode } from '@/lib/locations';

// Fix for default marker icon in Leaflet with Next.js
// We won't use default markers, we use custom DivIcons, but good to have.

interface MapWidgetProps {
    businesses: BusinessMock[];
    selectedBusiness?: BusinessMock | null;
    onBusinessSelect?: (business: BusinessMock) => void;
    onNavigate?: (business: BusinessMock) => void; // Explicit navigation action
    isAuthenticated?: boolean;
    countryCoordinates?: { lat: number; lng: number; zoom: number };
    countryCode?: string;
}

// Component to update map center if valid businesses are present
function MapUpdater({ businesses, selectedBusiness, countryCoordinates }: {
    businesses: BusinessMock[],
    selectedBusiness?: BusinessMock | null,
    countryCoordinates?: { lat: number; lng: number; zoom: number }
}) {
    const map = useMap();

    // Effect for initial load or filter changes
    useEffect(() => {
        if (!selectedBusiness) {
            // Prioritize Country Selection coordinates
            if (countryCoordinates) {
                map.flyTo([countryCoordinates.lat, countryCoordinates.lng], countryCoordinates.zoom, {
                    animate: true,
                    duration: 2.5,
                    easeLinearity: 0.25
                });
            } else if (businesses.length > 0) {
                map.flyTo([15.5042, -88.0250], 13);
            }
        }
    }, [businesses, map, selectedBusiness, countryCoordinates]);

    // Effect for specific selection (Click on List)
    useEffect(() => {
        if (selectedBusiness) {
            map.flyTo([selectedBusiness.lat, selectedBusiness.lng], 16, {
                animate: true,
                duration: 1.5
            });
        }
    }, [selectedBusiness, map]);

    return null;
}

const createCustomIcon = (icon: any, colorClass: string) => {
    const iconContent = typeof icon === 'string' ? icon : '?';

    return L.divIcon({
        className: 'custom-pin',
        html: `
            <div class="relative flex items-center justify-center w-10 h-10 transform -translate-x-1/2 -translate-y-1/2">
                <div class="absolute inset-0 rounded-full ${colorClass} opacity-50 animate-ping"></div>
                <div class="relative w-8 h-8 rounded-full ${colorClass} border-2 border-white shadow-lg flex items-center justify-center text-lg">
                    ${iconContent}
                </div>
                <div class="absolute top-full mt-1 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-white"></div>
            </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 20], // Center it
        popupAnchor: [0, -20]
    });
};

export default function MapWidget({
    businesses,
    selectedBusiness,
    onBusinessSelect,
    onNavigate,
    isAuthenticated = false,
    countryCoordinates,
    countryCode
}: MapWidgetProps) {
    const [isMounted, setIsMounted] = useState(false);
    const markerRefs = useRef<{ [key: string]: L.Marker | null }>({});
    const t = useTranslations('map');

    // Bounds & Clamping Logic
    const activeCountry = countryCode ? COUNTRIES[countryCode as CountryCode] : null;
    const countryBounds = activeCountry?.bounds; // [S, W, N, E]

    const getClampedPosition = (lat: number, lng: number): [number, number] => {
        if (!countryBounds) return [lat, lng];

        const [minLat, minLng, maxLat, maxLng] = countryBounds;
        const MARGIN = 0.05; // ~5.5km tolerance

        let newLat = lat;
        let newLng = lng;

        // Soft Clamp Latitude
        if (lat < minLat && lat >= minLat - MARGIN) newLat = minLat + 0.0001;
        else if (lat > maxLat && lat <= maxLat + MARGIN) newLat = maxLat - 0.0001;

        // Soft Clamp Longitude
        if (lng < minLng && lng >= minLng - MARGIN) newLng = minLng + 0.0001;
        else if (lng > maxLng && lng <= maxLng + MARGIN) newLng = maxLng - 0.0001;

        return [newLat, newLng];
    };

    useEffect(() => {
        setIsMounted(true);
    }, []);

    if (!isMounted) return <div className="h-64 w-full bg-slate-900 rounded-3xl animate-pulse flex items-center justify-center text-slate-500">{t('loading')}</div>;

    const startZoom = countryCoordinates ? Math.max(2, countryCoordinates.zoom - 2) : 11;
    const defaultPosition: [number, number] = countryCoordinates ? [countryCoordinates.lat, countryCoordinates.lng] : [15.50417, -88.02500];

    return (
        <MapContainer
            center={defaultPosition}
            zoom={startZoom}
            scrollWheelZoom={false}
            className="h-full w-full rounded-3xl z-0"
            style={{ height: '100%', width: '100%' }}
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            />

            <MapUpdater businesses={businesses} selectedBusiness={selectedBusiness} countryCoordinates={countryCoordinates} />

            {businesses.map((biz) => {
                const position = getClampedPosition(biz.lat, biz.lng);

                return (
                    <Marker
                        key={biz.id}
                        position={position}
                        icon={createCustomIcon(biz.icon, biz.color)}
                        ref={(el: any) => {
                            if (el) markerRefs.current[biz.id] = el;
                        }}
                        eventHandlers={{
                            click: () => {
                                // Let parent handle logic (Selection vs Navigation)
                                if (onBusinessSelect) {
                                    onBusinessSelect(biz);
                                }
                            }
                        }}
                    >
                        <Popup className="custom-popup" closeButton={false} minWidth={140} maxWidth={180}>
                            <div className="p-1 min-w-[140px] flex flex-col gap-1.5 text-center">
                                <div>
                                    <h3 className="font-bold text-slate-900 text-xs leading-none line-clamp-1">{biz.name}</h3>
                                    <p className="text-[10px] text-slate-500 font-medium mt-0.5">{biz.subcategory}</p>
                                </div>

                                {/* Minimalist Content */}
                                {isAuthenticated && (
                                    <p className="text-[10px] text-slate-400 line-clamp-1 hidden sm:block leading-tight">{biz.description}</p>
                                )}

                                <button
                                    onClick={(e) => {
                                        e.stopPropagation(); // Prevent map click
                                        if (onNavigate) onNavigate(biz);
                                    }}
                                    className={`w-full text-[10px] font-bold py-1 px-2 rounded transition-colors flex items-center justify-center gap-1
                                    ${isAuthenticated
                                            ? 'bg-slate-900 text-white hover:bg-slate-800'
                                            : 'bg-brand-neon-cyan/10 text-brand-dark-blue hover:bg-brand-neon-cyan/20 border border-brand-neon-cyan/20'}
                                `}
                                >
                                    {isAuthenticated ? t('viewProfile') : t('view')}
                                    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
                                </button>
                            </div>
                        </Popup>
                    </Marker>
                )
            })}
        </MapContainer>
    );
}
