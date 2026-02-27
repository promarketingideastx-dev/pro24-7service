'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';
import usePlacesAutocomplete, { getGeocode, getLatLng } from 'use-places-autocomplete';
import { MapPin, Loader2, Search, X } from 'lucide-react';

const LIBRARIES: ('places')[] = ['places'];

const MAP_CONTAINER_STYLE = { width: '100%', height: '220px' };
const DEFAULT_CENTER = { lat: 14.0818, lng: -87.2068 }; // Tegucigalpa

export interface LocationResult {
    lat: number;
    lng: number;
    placeId: string;
    formattedAddress: string;
    googleMapsUrl: string;
    city?: string;
    department?: string;
    country?: string;
}

interface Props {
    onLocationSelect: (result: LocationResult) => void;
    initialAddress?: string;
    initialLat?: number;
    initialLng?: number;
}

export default function PlacesLocationPicker({ onLocationSelect, initialAddress, initialLat, initialLng }: Props) {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

    const { isLoaded, loadError } = useJsApiLoader({
        googleMapsApiKey: apiKey,
        libraries: LIBRARIES,
    });

    const [markerPos, setMarkerPos] = useState<{ lat: number; lng: number }>(
        initialLat && initialLng ? { lat: initialLat, lng: initialLng } : DEFAULT_CENTER
    );
    const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>(
        initialLat && initialLng ? { lat: initialLat, lng: initialLng } : DEFAULT_CENTER
    );
    const mapRef = useRef<google.maps.Map | null>(null);

    const {
        ready,
        value,
        suggestions: { status, data },
        setValue,
        clearSuggestions,
    } = usePlacesAutocomplete({
        requestOptions: { componentRestrictions: { country: [] } },
        debounce: 300,
        defaultValue: initialAddress || '',
    });

    // When user selects a suggestion from the dropdown
    const handleSelect = useCallback(async (description: string, placeId: string) => {
        setValue(description, false);
        clearSuggestions();

        try {
            const results = await getGeocode({ placeId });
            const { lat, lng } = await getLatLng(results[0]);

            // Extract city, department, country from address_components
            let city = '';
            let department = '';
            let country = '';
            const comps = results[0].address_components;
            for (const comp of comps) {
                if (comp.types.includes('locality')) city = comp.long_name;
                if (comp.types.includes('administrative_area_level_1')) department = comp.long_name;
                if (comp.types.includes('country')) country = comp.short_name;
            }

            const pos = { lat, lng };
            setMarkerPos(pos);
            setMapCenter(pos);
            mapRef.current?.panTo(pos);
            mapRef.current?.setZoom(17);

            const result: LocationResult = {
                lat,
                lng,
                placeId,
                formattedAddress: description,
                googleMapsUrl: `https://www.google.com/maps/place/?q=place_id:${placeId}`,
                city,
                department,
                country,
            };
            onLocationSelect(result);
        } catch (err) {
            console.error('PlacesLocationPicker geocode error:', err);
        }
    }, [setValue, clearSuggestions, onLocationSelect]);

    // When user drags the marker to a new position
    const handleMarkerDragEnd = useCallback(async (e: google.maps.MapMouseEvent) => {
        if (!e.latLng) return;
        const lat = e.latLng.lat();
        const lng = e.latLng.lng();
        setMarkerPos({ lat, lng });

        try {
            const results = await getGeocode({ location: { lat, lng } });
            const address = results[0]?.formatted_address || '';
            const placeId = results[0]?.place_id || '';

            let city = '';
            let department = '';
            let country = '';
            const comps = results[0]?.address_components || [];
            for (const comp of comps) {
                if (comp.types.includes('locality')) city = comp.long_name;
                if (comp.types.includes('administrative_area_level_1')) department = comp.long_name;
                if (comp.types.includes('country')) country = comp.short_name;
            }

            setValue(address, false);

            const result: LocationResult = {
                lat,
                lng,
                placeId,
                formattedAddress: address,
                googleMapsUrl: placeId
                    ? `https://www.google.com/maps/place/?q=place_id:${placeId}`
                    : `https://maps.google.com/?q=${lat},${lng}`,
                city,
                department,
                country,
            };
            onLocationSelect(result);
        } catch (err) {
            console.error('Reverse geocode error:', err);
        }
    }, [setValue, onLocationSelect]);

    if (loadError) {
        return (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-400 text-sm">
                Error al cargar Google Maps. Verifica tu API Key.
            </div>
        );
    }

    if (!isLoaded) {
        return (
            <div className="flex items-center gap-2 text-slate-400 text-sm py-4">
                <Loader2 size={16} className="animate-spin" /> Cargando mapa...
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {/* Search Input */}
            <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                    <Search size={16} />
                </div>
                <input
                    type="text"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    disabled={!ready}
                    placeholder="Busca tu dirección exacta... ej: Multiplaza Tegucigalpa"
                    className="w-full h-12 bg-white border border-slate-200 rounded-lg pl-9 pr-9 text-slate-800 text-sm focus:outline-none focus:border-blue-500 placeholder:text-slate-400 disabled:opacity-50"
                />
                {value && (
                    <button
                        onClick={() => { setValue(''); clearSuggestions(); }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                        <X size={14} />
                    </button>
                )}

                {/* Suggestions dropdown */}
                {status === 'OK' && data.length > 0 && (
                    <ul className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
                        {data.map(({ place_id, description }) => (
                            <li
                                key={place_id}
                                onClick={() => handleSelect(description, place_id)}
                                className="flex items-start gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-blue-50 cursor-pointer border-b border-slate-100 last:border-0 transition-colors"
                            >
                                <MapPin size={14} className="text-blue-500 mt-0.5 shrink-0" />
                                <span>{description}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* Helper text */}
            <p className="text-xs text-slate-500 flex items-center gap-1">
                <MapPin size={11} />
                Si el pin no cayó exacto, arrástralo a la ubicación correcta.
            </p>

            {/* Map with draggable marker */}
            <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm">
                <GoogleMap
                    mapContainerStyle={MAP_CONTAINER_STYLE}
                    center={mapCenter}
                    zoom={initialLat ? 17 : 13}
                    onLoad={(map) => { mapRef.current = map; }}
                    options={{
                        disableDefaultUI: false,
                        zoomControl: true,
                        streetViewControl: false,
                        mapTypeControl: false,
                        fullscreenControl: false,
                        styles: [
                            { featureType: 'poi', stylers: [{ visibility: 'off' }] }
                        ]
                    }}
                >
                    <Marker
                        position={markerPos}
                        draggable
                        onDragEnd={handleMarkerDragEnd}
                        animation={google.maps.Animation.DROP}
                    />
                </GoogleMap>
            </div>
        </div>
    );
}
