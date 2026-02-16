'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { BusinessMock } from '@/data/mockBusinesses';

// Fix for default marker icon in Leaflet with Next.js
// We won't use default markers, we use custom DivIcons, but good to have.

interface MapWidgetProps {
    businesses: BusinessMock[];
}

// Component to update map center if valid businesses are present
function MapUpdater({ businesses }: { businesses: BusinessMock[] }) {
    const map = useMap();

    useEffect(() => {
        if (businesses.length > 0) {
            // Calculate bounds or center
            const group = L.featureGroup(businesses.map(b => L.marker([b.lat, b.lng])));
            // map.fitBounds(group.getBounds(), { padding: [50, 50] });
            // Or just fly to the first one for simplicity or center of SPS
            // San Pedro Sula Center: 15.50417, -88.02500
            map.flyTo([15.5042, -88.0250], 14);
        }
    }, [businesses, map]);

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

export default function MapWidget({ businesses }: MapWidgetProps) {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

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

            <MapUpdater businesses={businesses} />

            {businesses.map((biz) => (
                <Marker
                    key={biz.id}
                    position={[biz.lat, biz.lng]}
                    icon={createCustomIcon(biz.icon, biz.color)}
                >
                    <Popup className="custom-popup">
                        <div className="p-1 min-w-[150px]">
                            <h3 className="font-bold text-slate-900 text-sm">{biz.name}</h3>
                            <p className="text-xs text-slate-500">{biz.subcategory}</p>
                            <p className="text-[10px] text-slate-400 mt-1">{biz.description}</p>
                        </div>
                    </Popup>
                </Marker>
            ))}
        </MapContainer>
    );
}
