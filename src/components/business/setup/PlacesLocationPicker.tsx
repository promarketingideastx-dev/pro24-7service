
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
    countryCode?: string;
    cityContext?: string;
}

function PlacesLocationPickerInner({ onLocationSelect, initialAddress, initialLat, initialLng, countryCode, cityContext }: Props) {
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
        requestOptions: {
            componentRestrictions: countryCode ? { country: countryCode.toLowerCase() } : undefined
        },
        debounce: 300,
        defaultValue: initialAddress || '',
    });

    // Effect to center map on the selected city context if no initial coords were passed
    useEffect(() => {
        if (!initialLat && !initialLng && cityContext) {
            const query = `${cityContext}${countryCode ? `, ${countryCode}` : ''}`;
            getGeocode({ address: query }).then(async results => {
                if (results && results.length > 0) {
                    try {
                        const { lat, lng } = await getLatLng(results[0]);
                        setMapCenter({ lat, lng });
                        setMarkerPos({ lat, lng });
                        mapRef.current?.panTo({ lat, lng });
                        mapRef.current?.setZoom(13);
                    } catch (e) {
                        console.error("getLatLng error:", e);
                    }
                }
            }).catch(e => console.error("Geocoding city context error:", e));
        }
    }, [cityContext, countryCode, initialLat, initialLng]);

    // [CRITICAL FIX] Effect to synchronize the internal marker with parent formData changes.
    // When the user selects a valid suggestion, the parent formData is updated. This ensures
    // the map visually snaps to the new coordinates passed down as initialLat/Lng.
    useEffect(() => {
        if (initialLat && initialLng && (initialLat !== markerPos.lat || initialLng !== markerPos.lng)) {
            const pos = { lat: initialLat, lng: initialLng };
            setMarkerPos(pos);
            setMapCenter(pos);
            if (mapRef.current) {
                mapRef.current.panTo(pos);
                mapRef.current.setZoom(17);
            }
        }
    }, [initialLat, initialLng]);

    // When user selects a suggestion from the dropdown
    const handleSelect = useCallback(async (description: string, placeId: string) => {
        // Prevent generic blur overriding our selection
        setValue(description, false);
        clearSuggestions();

        try {
            // Priority 1: Try by placeId
            let results;
            try {
                results = await getGeocode({ placeId });
            } catch (err) {
                console.warn('Geocode by placeId failed, falling back to description:', err);
                // Priority 2: Fallback to textual description
                results = await getGeocode({ address: description });
            }

            if (!results || results.length === 0) {
                throw new Error("No geocoding results found for this selection.");
            }

            const { lat, lng } = await getLatLng(results[0]);

            // Extract city, department, country from address_components
            let city = '';
            let department = '';
            let country = '';
            const comps = results[0].address_components || [];
            for (const comp of comps) {
                if (comp.types.includes('locality')) city = comp.long_name;
                if (comp.types.includes('administrative_area_level_1')) department = comp.long_name;
                if (comp.types.includes('country')) country = comp.short_name;
            }

            const pos = { lat, lng };
            // Robust state update: Force the marker and center together
            setMarkerPos(pos);
            setMapCenter(pos);
            // Pan smoothly and zoom deeply
            if (mapRef.current) {
                mapRef.current.panTo(pos);
                mapRef.current.setZoom(17);
            }

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
            // If even fallback fails, we leave the picker untouched so they can manual drag.
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
            const address = results[0]?.formatted_address || value || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
            const placeId = results[0]?.place_id || '';

            let city = cityContext ? cityContext.split(',')[0] : '';
            let department = cityContext ? cityContext.split(',')[1]?.trim() : '';
            let country = countryCode || '';
            const comps = results[0]?.address_components || [];
            for (const comp of comps) {
                if (comp.types.includes('locality')) city = comp.long_name;
                if (comp.types.includes('administrative_area_level_1')) department = comp.long_name;
                if (comp.types.includes('country')) country = comp.short_name;
            }

            if (!value || results[0]?.formatted_address) {
                setValue(address, false);
            }

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
            const fallbackAddress = value || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
            const result: LocationResult = {
                lat,
                lng,
                placeId: '',
                formattedAddress: fallbackAddress,
                googleMapsUrl: `https://maps.google.com/?q=${lat},${lng}`,
                city: cityContext ? cityContext.split(',')[0] : '',
                department: cityContext ? cityContext.split(',')[1]?.trim() : '',
                country: countryCode || '',
            };
            onLocationSelect(result);
            if (!value) {
                setValue(fallbackAddress, false);
            }
            console.error('Reverse geocode fallback applied due to error:', err);
        }
    }, [setValue, onLocationSelect]);

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
                    onChange={(e) => {
                        const newText = e.target.value;
                        setValue(newText);
                        // [ROBUST REPAIR] Keep parent synchronized so the manual text is never lost
                        // CRITICAL: We DO NOT wipe out the lat/lng here just because they typed.
                        // We preserve the current markerPos so the pin doesn't snap back to default.
                        onLocationSelect({
                            lat: initialLat || markerPos.lat,
                            lng: initialLng || markerPos.lng,
                            placeId: '', // Invalidated since it's a free-text typing
                            formattedAddress: newText,
                            googleMapsUrl: `https://maps.google.com/?q=${initialLat || markerPos.lat},${initialLng || markerPos.lng}`,
                            city: cityContext ? cityContext.split(',')[0] : '',
                            department: cityContext ? cityContext.split(',')[1]?.trim() : '',
                            country: countryCode || '',
                        });
                    }}
                    disabled={!ready}
                    placeholder="Busca tu dirección exacta... ej: Multiplaza Tegucigalpa"
                    className="w-full h-12 bg-white border border-slate-200 rounded-lg pl-9 pr-9 text-slate-800 text-sm focus:outline-none focus:border-teal-500 placeholder:text-slate-400 disabled:opacity-50"
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
                                onMouseDown={(e) => {
                                    e.preventDefault(); // Evita que el input pierda el focus antes de ejecutar la función
                                    handleSelect(description, place_id);
                                }}
                                className="flex items-start gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0 transition-colors"
                            >
                                <MapPin size={14} className="text-teal-500 mt-0.5 shrink-0" />
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
            <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm relative">
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

export default function PlacesLocationPicker(props: Props) {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

    const { isLoaded, loadError } = useJsApiLoader({
        googleMapsApiKey: apiKey,
        libraries: LIBRARIES,
    });

    if (loadError) {
        return (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-500 text-sm">
                Error al cargar Google Maps. Verifica tu API Key o conexión: {loadError.message}
            </div>
        );
    }

    if (!isLoaded) {
        return (
            <div className="flex items-center gap-2 text-slate-400 text-sm py-4">
                <Loader2 size={16} className="animate-spin text-teal-500" /> Cargando mapa...
            </div>
        );
    }

    return <PlacesLocationPickerInner {...props} />;
}
