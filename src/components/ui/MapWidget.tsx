'use client';

import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { BusinessMock } from '@/data/mockBusinesses';

// Fix for default marker icon in Leaflet with Next.js
// We won't use default markers, we use custom DivIcons, but good to have.

interface MapWidgetProps {
    businesses: BusinessMock[];
    selectedBusiness?: BusinessMock | null;
    onBusinessSelect?: (business: BusinessMock) => void;
}

// Component to update map center if valid businesses are present
function MapUpdater({ businesses, selectedBusiness }: { businesses: BusinessMock[], selectedBusiness?: BusinessMock | null }) {
    const map = useMap();

    // Effect for initial load or filter changes
    useEffect(() => {
        if (businesses.length > 0 && !selectedBusiness) {
            // If no specific selection, view all (fltBounds) or center SPS
            const group = L.featureGroup(businesses.map(b => L.marker([b.lat, b.lng])));
            // map.fitBounds(group.getBounds(), { padding: [50, 50] });
            map.flyTo([15.5042, -88.0250], 13);
        }
    }, [businesses, map, selectedBusiness]);

    // Effect for specific selection (Click on List)
    useEffect(() => {
        if (selectedBusiness) {
            map.flyTo([selectedBusiness.lat, selectedBusiness.lng], 16, {
                animate: true,
                duration: 1.5
            });
            // Note: Opening a popup programmatically requires a bit more setup
            // if you want it to be tied to the marker. For now, just flying to it.
            // To open a popup, you'd typically need a ref to the Marker component
            // or iterate through markers to find the one matching selectedBusiness.
            // For simplicity, we'll just fly to the location.
            // map.openPopup(L.latLng(selectedBusiness.lat, selectedBusiness.lng));
        }
    }, [selectedBusiness, map]);

    return null;
}

const createCustomIcon = (icon: any, colorClass: string) => {
    // Extract bg color from class (e.g. 'bg-orange-500') to a hex or RGB for style if needed
    // For simplicity, we just use the class in a wrapper div.

    // We render the emoji or icon as string.
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

export default function MapWidget({ businesses, selectedBusiness, onBusinessSelect }: MapWidgetProps) {
    const [isMounted, setIsMounted] = useState(false);
    const markerRefs = useRef<{ [key: string]: L.Marker | null }>({});

    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Effect to open popup when selectedBusiness changes
    useEffect(() => {
        if (selectedBusiness && markerRefs.current[selectedBusiness.id]) {
            const marker = markerRefs.current[selectedBusiness.id];
            if (marker) {
                marker.openPopup();
            }
        }
    }, [selectedBusiness]);

    if (!isMounted) return <div className="h-64 w-full bg-slate-900 rounded-3xl animate-pulse flex items-center justify-center text-slate-500">Cargando Mapa...</div>;

    const spsPosition: [number, number] = [15.50417, -88.02500];

    return (
        <MapContainer
            center={spsPosition}
            zoom={14}
            scrollWheelZoom={false}
            className="h-full w-full rounded-3xl z-0"
            style={{ height: '100%', width: '100%' }}
        >
            {/* Voyager Map Tiles (Clean, Clear, Not Dark/White) */}
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            />

            <MapUpdater businesses={businesses} selectedBusiness={selectedBusiness} />

            {businesses.map((biz) => (
                <Marker
                    key={biz.id}
                    position={[biz.lat, biz.lng]}
                    icon={createCustomIcon(biz.icon, biz.color)}
                    ref={(el: any) => {
                        if (el) markerRefs.current[biz.id] = el;
                    }}
                    eventHandlers={{
                        click: () => {
                            if (onBusinessSelect) {
                                onBusinessSelect(biz);
                            }
                        }
                    }}
                >
                    <Popup className="custom-popup">
                        <div className="p-2 min-w-[160px] flex flex-col gap-2">
                            <div>
                                <h3 className="font-bold text-slate-900 text-sm leading-tight">{biz.name}</h3>
                                <p className="text-xs text-slate-500 font-medium">{biz.subcategory}</p>
                            </div>
                            <p className="text-[10px] text-slate-400 line-clamp-2">{biz.description}</p>

                            <button
                                onClick={() => {
                                    window.location.href = `/negocio/${biz.id}`;
                                }}
                                className="w-full bg-slate-900 text-white text-xs font-bold py-1.5 px-3 rounded-lg hover:bg-slate-800 transition-colors flex items-center justify-center gap-1 mt-1"
                            >
                                Ver Perfil
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
                            </button>
                        </div>
                    </Popup>
                </Marker>
            ))}
        </MapContainer>
    );
}
