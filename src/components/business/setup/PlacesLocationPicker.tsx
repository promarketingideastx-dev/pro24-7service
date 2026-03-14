'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';
import usePlacesAutocomplete, { getGeocode, getLatLng } from 'use-places-autocomplete';
import { MapPin, Loader2, Search, X, Check, AlertTriangle, Navigation } from 'lucide-react';
import { toast } from 'sonner';
import { getCountryConfig, CountryCode } from '@/lib/locations';

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
    source: 'google' | 'manual';
    isConfirmed: boolean;
}

interface Props {
    onLocationSelect: (result: LocationResult) => void;
    initialAddress?: string;
    initialLat?: number;
    initialLng?: number;
    countryCode?: string;
    defaultMapCenter?: { lat: number; lng: number };
}

function PlacesLocationPickerInner({ onLocationSelect, initialAddress, initialLat, initialLng, countryCode, defaultMapCenter }: Props) {
    const defaultCenter = defaultMapCenter || { lat: 14.0818, lng: -87.2068 };

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

    const lastSentCoordsRef = useRef<{ lat: number, lng: number } | null>(
        initialLat && initialLng ? { lat: initialLat, lng: initialLng } : null
    );

    const prevCountryCodeRef = useRef(countryCode);

    // [CRITICAL FIX] Reset internal autocomplete and marker cache ONLY when countryCode actually changes globally
    useEffect(() => {
        if (countryCode && countryCode !== prevCountryCodeRef.current) {
            setValue('', false);
            clearSuggestions();
            lastSentCoordsRef.current = null;
            prevCountryCodeRef.current = countryCode;
        }
    }, [countryCode, setValue, clearSuggestions]);

    // Handle user GPS Location
    const handleGPS = () => {
        if (!navigator.geolocation) {
            toast.error("Tu dispositivo o navegador no soporta geolocalización.");
            return;
        }

        const toastId = toast.loading("Obteniendo tu ubicación actual...");
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                toast.dismiss(toastId);

                // FORZAMOS a React a registrar la posición ilegal primero
                // para que la reversión subsiguiente obligue al pin a saltar visualmente.
                setMarkerPos({ lat, lng });

                try {
                    const geocoder = new window.google.maps.Geocoder();
                    const response = await geocoder.geocode({ location: { lat, lng } });

                    let fallbackAddress = '';
                    let fallbackCity = '';
                    let fallbackDep = '';
                    let fallbackCountry = '';
                    let fallbackPlaceId = '';

                    if (response.results && response.results.length > 0) {
                        const resultGeocode = response.results[0];
                        fallbackAddress = resultGeocode.formatted_address;
                        fallbackPlaceId = resultGeocode.place_id;

                        // Search more broadly for country in case results[0] lacks it
                        for (const res of response.results) {
                            const comps = res.address_components || [];
                            for (const comp of comps) {
                                if (comp.types.includes('locality') && !fallbackCity) fallbackCity = comp.long_name;
                                if (comp.types.includes('administrative_area_level_1') && !fallbackDep) fallbackDep = comp.long_name;
                                if (comp.types.includes('country') && !fallbackCountry) fallbackCountry = comp.short_name;
                            }
                        }

                        if (countryCode && fallbackCountry && fallbackCountry.toUpperCase() !== countryCode.toUpperCase()) {
                            toast.success(`Tu ubicación detectada (${fallbackCountry.toUpperCase()}) debe coincidir con el país de registro (${countryCode.toUpperCase()}).`, {
                                icon: '📍',
                                style: { background: '#F0FDF4', color: '#166534', borderColor: '#BBF7D0' }
                            });
                            // We do NOT update mapCenter or markerPos here. It reverts.
                            const revertPos = lastSentCoordsRef.current || defaultCenter;
                            setMarkerPos(revertPos);
                            setMapCenter(revertPos);
                            mapRef.current?.panTo(revertPos);
                            return;
                        }

                        setValue(fallbackAddress, false);
                    }

                    // Only update UI if validation passed (or if no results, we assume it's okay for now)
                    setMapCenter({ lat, lng });
                    setMarkerPos({ lat, lng });
                    if (mapRef.current) {
                        mapRef.current.panTo({ lat, lng });
                        mapRef.current.setZoom(17);
                    }

                    const result: LocationResult = {
                        lat,
                        lng,
                        placeId: fallbackPlaceId,
                        formattedAddress: fallbackAddress,
                        displayAddress: fallbackAddress,
                        googleMapsUrl: `https://maps.google.com/?q=${lat},${lng}`,
                        city: fallbackCity,
                        department: fallbackDep,
                        country: fallbackCountry || countryCode,
                        source: 'manual',
                        isConfirmed: true,
                    };

                    lastSentCoordsRef.current = { lat, lng };
                    onLocationSelect(result);
                    toast.success('Ubicación actualizada correctamente.');

                } catch (err) {
                    console.error('Reverse geocode from GPS error:', err);
                    toast.error("No pudimos verificar a qué país pertenece tu ubicación actual. Intenta nuevamente.");
                    // Revertimos a lo seguro, no guardamos un punto no validado
                    const revertPos = lastSentCoordsRef.current || defaultCenter;
                    setMarkerPos(revertPos);
                    setMapCenter(revertPos);
                    mapRef.current?.panTo(revertPos);
                    return;
                }
            },
            (error) => {
                toast.dismiss(toastId);
                toast.error("No pudimos obtener la ubicación. Activa tu GPS.");
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    // When user selects a suggestion from the dropdown
    const handleSelect = useCallback(async (description: string, placeId: string) => {
        try {
            setValue(description, false);
            clearSuggestions();

            let lat: number;
            let lng: number;
            let comps: any[] = [];
            let formattedAddress = '';

            try {
                if (!placeId) throw new Error("No placeId provided");
                const geocoder = new window.google.maps.Geocoder();
                const response = await geocoder.geocode({ placeId: placeId });

                if (!response.results || response.results.length === 0) {
                    throw new Error("Geocoding API falló en resolver este placeId.");
                }

                const resultGeocode = response.results[0];
                lat = resultGeocode.geometry.location.lat();
                lng = resultGeocode.geometry.location.lng();
                comps = resultGeocode.address_components || [];
                if (resultGeocode.formatted_address) formattedAddress = resultGeocode.formatted_address;
            } catch (err) {
                console.warn('Geocoding fallo, usando texto literal:', err);
                const geocoder = new window.google.maps.Geocoder();
                const geocodeOptions: google.maps.GeocoderRequest = { address: description };
                if (countryCode) {
                    geocodeOptions.componentRestrictions = { country: countryCode };
                }
                const response = await geocoder.geocode(geocodeOptions);
                if (!response.results || response.results.length === 0) {
                    throw new Error("No se encontraron resultados");
                }
                const resultGeocode = response.results[0];
                lat = resultGeocode.geometry.location.lat();
                lng = resultGeocode.geometry.location.lng();
                comps = resultGeocode.address_components || [];
                if (resultGeocode.formatted_address) formattedAddress = resultGeocode.formatted_address;
            }

            let city = '';
            let department = '';
            let country = '';
            // Extraer componentes
            for (const comp of comps) {
                if (comp.types.includes('locality') && !city) city = comp.long_name;
                if (comp.types.includes('administrative_area_level_1') && !department) department = comp.long_name;
                if (comp.types.includes('country') && !country) country = comp.short_name;
            }

            if (countryCode && country && country.toUpperCase() !== countryCode.toUpperCase()) {
                toast.success(`La ubicación sugerida (${country.toUpperCase()}) debe pertenecer al país de registro (${countryCode.toUpperCase()}).`, {
                    icon: '📍',
                    style: { background: '#F0FDF4', color: '#166534', borderColor: '#BBF7D0' }
                });
                const revertPos = lastSentCoordsRef.current || defaultCenter;
                setMarkerPos(revertPos);
                setMapCenter(revertPos);
                mapRef.current?.panTo(revertPos);
                setValue("", false);
                return;
            }

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
                displayAddress: description,
                formattedAddress: formattedAddress || description,
                googleMapsUrl: `https://www.google.com/maps/place/?q=place_id:${placeId}`,
                city,
                department,
                country,
                source: 'google',
                isConfirmed: true,
            };

            lastSentCoordsRef.current = pos;
            onLocationSelect(result);

        } catch (err: any) {
            console.error('PlacesLocationPicker handleSelect error:', err);
            // Silencioso: no mostramos error rojo agresivo por geocoding abstracto.
        }
    }, [setValue, clearSuggestions, onLocationSelect, countryCode]);

    // When user drags the marker to a new position
    const handleMarkerDragEnd = useCallback(async (e: google.maps.MapMouseEvent) => {
        if (!e.latLng) return;
        const lat = e.latLng.lat();
        const lng = e.latLng.lng();

        // FORZAMOS a React a registrar la posición ilegal primero
        // para que la reversión subsiguiente sea un cambio de estado y el pin salte visualmente.
        setMarkerPos({ lat, lng });

        let fallbackAddress = '';
        let fallbackCity = '';
        let fallbackDep = '';
        let fallbackCountry = '';
        let fallbackPlaceId = '';

        let isInsideCountry = true;

        try {
            const geocoder = new window.google.maps.Geocoder();
            const response = await geocoder.geocode({ location: { lat, lng } });
            if (response.results && response.results.length > 0) {
                const resultGeocode = response.results[0];
                fallbackAddress = resultGeocode.formatted_address;
                fallbackPlaceId = resultGeocode.place_id;

                // TO FIND CITY/DEP/COUNTRY, search across ALL results 
                for (const res of response.results) {
                    const comps = res.address_components || [];
                    for (const comp of comps) {
                        if (comp.types.includes('locality') && !fallbackCity) fallbackCity = comp.long_name;
                        if (comp.types.includes('administrative_area_level_1') && !fallbackDep) fallbackDep = comp.long_name;
                        if (comp.types.includes('country') && !fallbackCountry) fallbackCountry = comp.short_name;
                    }
                }

                if (countryCode && fallbackCountry && fallbackCountry.toUpperCase() !== countryCode.toUpperCase()) {
                    isInsideCountry = false;
                }
            } else {
                throw new Error("ZERO_RESULTS");
            }
        } catch (err) {
            console.error('Reverse geocode error or ZERO_RESULTS:', err);
            // ZERO_RESULTS o error de API: No podemos certificar de qué país es.
            // Rechazamos por seguridad en vez de usar Caja Limítrofe (Area) que sangra hacia otros países.
            isInsideCountry = false;
        }

        if (!isInsideCountry) {
            const detected = fallbackCountry ? fallbackCountry.toUpperCase() : 'Área no mapeada';
            toast.success(`La ubicación (${detected}) limita fuera de tu país (${countryCode?.toUpperCase()}).`, {
                icon: '📍',
                style: { background: '#F0FDF4', color: '#166534', borderColor: '#BBF7D0' }
            });
            const revertPos = lastSentCoordsRef.current || defaultCenter;
            setMarkerPos(revertPos);
            setMapCenter(revertPos);
            mapRef.current?.panTo(revertPos);
            return;
        }

        // Si pasa la validación, confirmamos el pin en ese lugar
        setMarkerPos({ lat, lng });
        if (fallbackAddress) {
            setValue(fallbackAddress, false);
        }

        const finalAddressText = fallbackAddress || "Ubicación marcada en el mapa";
        if (!fallbackAddress) setValue(finalAddressText, false);

        const result: LocationResult = {
            lat,
            lng,
            placeId: fallbackPlaceId,
            displayAddress: finalAddressText,
            formattedAddress: finalAddressText,
            googleMapsUrl: `https://maps.google.com/?q=${lat},${lng}`,
            city: fallbackCity,
            department: fallbackDep,
            country: fallbackCountry || countryCode || '',
            source: 'manual',
            isConfirmed: true, // El mapa siempre manda
        };

        lastSentCoordsRef.current = { lat, lng };
        onLocationSelect(result);

        toast.success('Dirección configurada desde el mapa.');
    }, [countryCode, onLocationSelect, setValue]);

    return (
        <div className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
                <button
                    onClick={handleGPS}
                    type="button"
                    className="flex-shrink-0 flex items-center justify-center gap-2 h-12 px-4 rounded-lg font-medium bg-teal-50 text-teal-600 border border-teal-200 hover:bg-teal-100 hover:border-teal-300 transition-colors"
                >
                    <Navigation size={18} />
                    <span>Usar mi ubicación</span>
                </button>

                <div className="relative w-full">
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
                            if (isSelectingRef.current) return;
                            // En flujo directo, si editan el input y salen, mantemos coordenadas actuales pero mostramos alerta que debe completarse o usar pin.
                            // Aquí no invalidamos coordenadas duras, el mapa manda siempre.
                        }}
                        disabled={!ready}
                        placeholder="Busca tu dirección o arrastra el pin..."
                        className="w-full h-12 bg-white border border-slate-200 rounded-lg pl-9 pr-9 text-slate-800 text-sm focus:outline-none focus:border-teal-500 placeholder:text-slate-400 disabled:opacity-50"
                    />
                    {value && (
                        <button
                            onClick={() => { setValue(''); clearSuggestions(); }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            type="button"
                        >
                            <X size={14} />
                        </button>
                    )}

                    {status === 'OK' && data.length > 0 && (
                        <ul className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
                            {data.map(({ place_id, description }) => (
                                <li
                                    key={place_id}
                                    onPointerDown={() => {
                                        isSelectingRef.current = true;
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
            </div>

            <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm relative mt-4">
                <GoogleMap
                    mapContainerStyle={MAP_CONTAINER_STYLE}
                    center={mapCenter}
                    zoom={initialLat ? 16 : 9}
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

            {!initialLat && (
                <div className="mt-2 flex items-center gap-2 text-amber-700 text-sm animate-in fade-in">
                    <AlertTriangle size={16} />
                    <span>Mueve el pin o usa tu GPS para establecer tu ubicación garantizada.</span>
                </div>
            )}
        </div>
    );
}

export function PlacesLocationPicker(props: Props) {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

    const { isLoaded, loadError } = useJsApiLoader({
        googleMapsApiKey: apiKey,
        libraries: LIBRARIES,
    });

    if (loadError) {
        return (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 flex items-start gap-3 shadow-sm">
                <AlertTriangle size={20} className="text-amber-500 shrink-0 mt-0.5" />
                <div>
                    <h3 className="text-slate-800 font-medium text-sm">El mapa está cargando</h3>
                    <p className="text-slate-600 text-xs mt-1">Si no aparece, verifica tu conexión a internet o recarga la página.</p>
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

    return <PlacesLocationPickerInner key={props.countryCode || 'default'} {...props} />;
}
