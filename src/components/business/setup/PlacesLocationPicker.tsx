
'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';
import usePlacesAutocomplete, { getGeocode, getLatLng } from 'use-places-autocomplete';
import { MapPin, Loader2, Search, X, Check, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

const LIBRARIES: ('places')[] = ['places'];
const MAP_CONTAINER_STYLE = { width: '100%', height: '220px' };

export interface LocationResult {
    lat: number;
    lng: number;
    placeId: string;
    formattedAddress: string;
    displayAddress?: string;
    plusCode?: string;
    googleMapsUrl: string;
    city?: string;
    department?: string;
    country?: string;
    source: 'google' | 'manual' | 'legacy';
    isConfirmed: boolean;
}

interface Props {
    onLocationSelect: (result: LocationResult) => void;
    initialAddress?: string;
    initialLat?: number;
    initialLng?: number;
    countryCode?: string;
    cityContext?: string;
    defaultMapCenter?: { lat: number; lng: number };
}

function PlacesLocationPickerInner({ onLocationSelect, initialAddress, initialLat, initialLng, countryCode, cityContext, defaultMapCenter }: Props) {
    const defaultCenter = defaultMapCenter || { lat: 14.0818, lng: -87.2068 }; // Fallback to Tegucigalpa only if defaultMapCenter is entirely missing

    const [markerPos, setMarkerPos] = useState<{ lat: number; lng: number }>(
        initialLat && initialLng ? { lat: initialLat, lng: initialLng } : defaultCenter
    );
    const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>(
        initialLat && initialLng ? { lat: initialLat, lng: initialLng } : defaultCenter
    );
    const mapRef = useRef<google.maps.Map | null>(null);
    const isSelectingRef = useRef(false);

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

    // Controles de una sola vía (Single Source of Truth fix)
    const isMapReady = Boolean(cityContext || initialLat || value);
    const isInternalUpdateRef = useRef(false);
    const lastSentCoordsRef = useRef<{ lat: number, lng: number } | null>(null);
    const lastConfirmedTextRef = useRef<string>(initialAddress || '');
    const lastConfirmedPlaceIdRef = useRef<string>('');

    // Effect to center map on the selected city context if no initial coords were passed
    useEffect(() => {
        if (!initialLat && !initialLng && cityContext) {
            const query = `${cityContext}${countryCode ? `, ${countryCode}` : ''}`;
            const geocodeReq: google.maps.GeocoderRequest = { address: query };
            if (countryCode) {
                geocodeReq.componentRestrictions = { country: countryCode };
            }
            getGeocode(geocodeReq as any).then(async results => {
                if (results && results.length > 0) {
                    try {
                        const { lat, lng } = await getLatLng(results[0]);
                        setMapCenter({ lat, lng });
                        setMarkerPos({ lat, lng });
                        mapRef.current?.panTo({ lat, lng });
                        mapRef.current?.setZoom(13);

                        // [NUEVO] Informar al padre de la coordenada de la ciudad, para anular la coordenada vieja.
                        const result: LocationResult = {
                            lat,
                            lng,
                            placeId: results[0].place_id || '',
                            formattedAddress: initialAddress || '', // Preservar texto escrito
                            googleMapsUrl: results[0].place_id ? `https://www.google.com/maps/place/?q=place_id:${results[0].place_id}` : '',
                            city: cityContext.split(',')[0],
                            department: cityContext.split(',')[1]?.trim(),
                            country: countryCode,
                            source: 'google',
                            isConfirmed: false, // NO es final, requiere selección de calle real
                        };
                        isInternalUpdateRef.current = true;
                        lastSentCoordsRef.current = { lat, lng };
                        onLocationSelect(result);
                    } catch (e) {
                        console.error("getLatLng error:", e);
                    }
                }
            }).catch(e => console.error("Geocoding city context error:", e));
        }
    }, [cityContext, countryCode, initialLat, initialLng]);

    // [CRITICAL FIX] Reset internal autocomplete and marker cache when countryCode changes globally
    useEffect(() => {
        if (countryCode) {
            setValue('', false);
            clearSuggestions();
            lastConfirmedTextRef.current = '';
            lastConfirmedPlaceIdRef.current = '';
            lastSentCoordsRef.current = null;
        }
    }, [countryCode, setValue, clearSuggestions]);

    // [CRITICAL FIX] Effect to synchronize the internal marker with parent formData changes.
    // Ensure we only listen to external resets, and completely ignore the "echoes" of our own updates.
    useEffect(() => {
        if (initialLat && initialLng) {
            // 1. Si el padre nos manda las mismas coordenadas que le acabamos de mandar, es un Eco del estado.
            // Lo ignoramos para que el mapa no tartamudee ni haga "efecto rebote".
            if (isInternalUpdateRef.current && lastSentCoordsRef.current) {
                const isEcho = Math.abs(lastSentCoordsRef.current.lat - initialLat) < 0.00001 &&
                    Math.abs(lastSentCoordsRef.current.lng - initialLng) < 0.00001;
                if (isEcho) {
                    isInternalUpdateRef.current = false; // Apagamos bandera, eco consumido y evadido
                    return;
                }
            }

            // 2. Si es distinto (el padre cambió de idea, o es on-load), cambiamos todo de forma segura
            setMarkerPos((currentPos) => {
                const diffLat = Math.abs(initialLat - currentPos.lat);
                const diffLng = Math.abs(initialLng - currentPos.lng);
                if (diffLat > 0.00001 || diffLng > 0.00001) {
                    const pos = { lat: initialLat, lng: initialLng };
                    setMapCenter(pos);
                    if (mapRef.current) {
                        mapRef.current.panTo(pos);
                        mapRef.current.setZoom(17);
                    }
                    return pos;
                }
                return currentPos;
            });
        } else {
            // 3. Si el padre manda undefined (p. ej. cambio de departamento), el marker DEBE reiniciarse visualmente.
            // En vez de quedarse en Tegucigalpa, esperamos que cityContext responda.
            // Si no hay coords explícitas, obligamos al estado local a re-sincronizar después.
            // No hacemos nada activo de Panning aquí para evitar romper la animación de cityContext.
            isInternalUpdateRef.current = false;
        }
    }, [initialLat, initialLng]); // Ya NO dependen de markerPos, cero ciclos infinitos

    // When user selects a suggestion from the dropdown
    const handleSelect = useCallback(async (description: string, placeId: string) => {
        try {
            // Instantly update UI for immediate UX feedback
            setValue(description, false);
            clearSuggestions();

            let lat: number;
            let lng: number;
            let comps: any[] = [];
            let plusCode = '';
            let formattedAddress = '';

            try {
                if (!placeId) throw new Error("No placeId provided");

                // Usar Geocoder nativo para resolver el placeId a una geometría exacta con precision
                const geocoder = new window.google.maps.Geocoder();
                const response = await geocoder.geocode({ placeId: placeId });

                if (!response.results || response.results.length === 0) {
                    throw new Error("Geocoding API falló en resolver este placeId.");
                }

                const resultGeocode = response.results[0];
                lat = resultGeocode.geometry.location.lat();
                lng = resultGeocode.geometry.location.lng();
                comps = resultGeocode.address_components || [];
                if (resultGeocode.plus_code && resultGeocode.plus_code.global_code) plusCode = resultGeocode.plus_code.global_code;
                if (resultGeocode.formatted_address) formattedAddress = resultGeocode.formatted_address;

                // Validación de precisión (ROOFTOP vs APPROXIMATE) - Removida por nueva regla UI
            } catch (err) {
                console.warn('Obtener geometry desde Places falló, usando native Geocoder con texto:', err);

                const geocoder = new window.google.maps.Geocoder();
                const geocodeOptions: google.maps.GeocoderRequest = { address: description };
                if (countryCode) {
                    geocodeOptions.componentRestrictions = { country: countryCode };
                }
                const response = await geocoder.geocode(geocodeOptions);
                if (!response.results || response.results.length === 0) {
                    throw new Error("Geocoding API falló en resolver esta dirección como fallback.");
                }
                const resultGeocode = response.results[0];
                lat = resultGeocode.geometry.location.lat();
                lng = resultGeocode.geometry.location.lng();
                comps = resultGeocode.address_components || [];
                if (resultGeocode.plus_code && resultGeocode.plus_code.global_code) plusCode = resultGeocode.plus_code.global_code;
                if (resultGeocode.formatted_address) formattedAddress = resultGeocode.formatted_address;
            }

            let city = '';
            let department = '';
            let country = '';
            for (const comp of comps) {
                if (comp.types.includes('locality')) city = comp.long_name;
                if (comp.types.includes('administrative_area_level_1')) department = comp.long_name;
                if (comp.types.includes('country')) country = comp.short_name;
            }

            // [FUNDAMENTAL FIX]: La geometría resuelta es la FUENTE DE VERDAD ABSOLUTA
            const pos = { lat, lng };
            setMarkerPos(pos);
            setMapCenter(pos);

            if (mapRef.current) {
                mapRef.current.panTo(pos);
                mapRef.current.setZoom(17);
            }

            const result: LocationResult = {
                lat,
                lng,
                placeId,
                displayAddress: description, // Lo que vio el usuario y dio click
                formattedAddress: formattedAddress || description, // El real de Google
                plusCode, // Se guarda pero no se muestra de adorno principal
                googleMapsUrl: `https://www.google.com/maps/place/?q=place_id:${placeId}`,
                city,
                department,
                country,
                source: 'google',
                isConfirmed: true, // Habilita el botón "Continuar" sin errores falsos
            };

            lastConfirmedPlaceIdRef.current = placeId;
            lastConfirmedTextRef.current = description;
            lastSentCoordsRef.current = pos;
            isInternalUpdateRef.current = true;
            onLocationSelect(result);

        } catch (err: any) {
            console.error('PlacesLocationPicker handleSelect error:', err);
            toast.error('Ocurrió un error consultando a Google. Por favor, intenta de nuevo o mueve el pin manualmente.');
        }
    }, [setValue, clearSuggestions, onLocationSelect, countryCode]);

    // When user drags the marker to a new position
    const handleMarkerDragEnd = useCallback(async (e: google.maps.MapMouseEvent) => {
        if (!e.latLng) return;
        const lat = e.latLng.lat();
        const lng = e.latLng.lng();
        setMarkerPos({ lat, lng });

        let fallbackAddress = '';
        let fallbackCity = '';
        let fallbackDep = '';
        let fallbackCountry = '';
        let fallbackPlaceId = '';
        let fallbackPlusCode = '';

        try {
            const geocoder = new window.google.maps.Geocoder();
            const response = await geocoder.geocode({ location: { lat, lng } });
            if (response.results && response.results.length > 0) {
                const resultGeocode = response.results[0];
                fallbackAddress = resultGeocode.formatted_address;
                fallbackPlaceId = resultGeocode.place_id;
                if (resultGeocode.plus_code && resultGeocode.plus_code.global_code) fallbackPlusCode = resultGeocode.plus_code.global_code;

                const comps = resultGeocode.address_components || [];
                for (const comp of comps) {
                    if (comp.types.includes('locality')) fallbackCity = comp.long_name;
                    if (comp.types.includes('administrative_area_level_1')) fallbackDep = comp.long_name;
                    if (comp.types.includes('country')) fallbackCountry = comp.short_name;
                }

                // REGLA: El pin siempre actualiza la dirección (reverse geocoding como fuente de verdad del pin)
                setValue(fallbackAddress, false);
            }
        } catch (err) {
            console.error('Reverse geocode error:', err);
        }

        const finalAddressText = fallbackAddress || value || initialAddress || '';
        const finalPlaceId = fallbackPlaceId || lastConfirmedPlaceIdRef.current || '';

        const result: LocationResult = {
            lat,
            lng,
            placeId: finalPlaceId,
            displayAddress: finalAddressText,
            formattedAddress: finalAddressText,
            plusCode: fallbackPlusCode,
            googleMapsUrl: `https://maps.google.com/?q=${lat},${lng}`,
            city: fallbackCity || (cityContext ? cityContext.split(',')[0] : ''),
            department: fallbackDep || (cityContext ? cityContext.split(',')[1]?.trim() : ''),
            country: fallbackCountry || countryCode || '',
            source: 'manual',
            isConfirmed: true,
        };

        lastSentCoordsRef.current = { lat, lng };
        lastConfirmedTextRef.current = finalAddressText;
        lastConfirmedPlaceIdRef.current = finalPlaceId;
        isInternalUpdateRef.current = true;
        onLocationSelect(result);

        toast.success('Dirección actualizada basada en el pin.');
    }, [value, initialAddress, cityContext, countryCode, onLocationSelect, setValue]);

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
                        setValue(e.target.value);
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                        }
                    }}
                    onBlur={(e) => {
                        // Prevent race condition: if user is selecting a suggestion, don't trigger blur logic
                        // which might hold stale coordinates and overwrite the newly fetched ones in the parent.
                        if (isSelectingRef.current) return;

                        // When leaving input, keep text in parent but DO NOT invent fake coordinates
                        // Only trigger if text actually changed from what the parent knows
                        if (e.target.value && e.target.value !== initialAddress && e.target.value !== lastConfirmedTextRef.current) {
                            onLocationSelect({
                                lat: markerPos.lat, // markerPos is always the internal source of truth
                                lng: markerPos.lng,
                                placeId: '',
                                formattedAddress: e.target.value,
                                googleMapsUrl: `https://maps.google.com/?q=${markerPos.lat},${markerPos.lng}`,
                                city: cityContext ? cityContext.split(',')[0] : '',
                                department: cityContext ? cityContext.split(',')[1]?.trim() : '',
                                country: countryCode || '',
                                source: 'manual',
                                isConfirmed: false, // Requiere confirmación por marker o google drop
                            });
                        }
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
                                onPointerDown={() => {
                                    isSelectingRef.current = true; // Bloquea onBlur prematuro en móviles al tocar
                                }}
                                onClick={(e) => {
                                    e.preventDefault();
                                    handleSelect(description, place_id).finally(() => {
                                        setTimeout(() => { isSelectingRef.current = false; }, 300);
                                    });
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

            {/* Map with draggable marker */}
            <div className={`rounded-xl overflow-hidden border border-slate-200 shadow-sm relative mt-4 transition-opacity ${!isMapReady ? 'opacity-40 grayscale pointer-events-none' : 'opacity-100'}`}>
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

            {/* Confirmación Visual Persistente */}
            {
                initialLat && initialLng && (
                    <div className="mt-4 flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl text-green-800 text-sm animate-in fade-in slide-in-from-bottom-2">
                        <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center shrink-0 shadow-sm shadow-green-500/30">
                            <Check size={16} strokeWidth={3} />
                        </div>
                        <div>
                            <p className="font-bold">Ubicación lista y guardada</p>
                            <p className="text-xs text-green-600/90 mt-0.5">Esta será la ubicación oficial para tus clientes.</p>
                        </div>
                    </div>
                )
            }
        </div >
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
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex items-start gap-3 shadow-sm">
                <AlertTriangle size={20} className="text-red-500 shrink-0 mt-0.5" />
                <div>
                    <h3 className="text-red-800 font-medium text-sm">Error al cargar mapas de Google</h3>
                    <p className="text-red-600/90 text-xs mt-1 leading-relaxed">Verifica tu conexión a internet o contacta a soporte técnico si este problema persiste. ({loadError.message})</p>
                </div>
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
