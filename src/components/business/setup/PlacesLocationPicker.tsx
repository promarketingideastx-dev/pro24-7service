'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { GoogleMap, useJsApiLoader, Marker, Autocomplete } from '@react-google-maps/api';
import { Loader2, Search, X, AlertTriangle, Navigation } from 'lucide-react';
import { toast } from 'sonner';
import { getCountryConfig, CountryCode } from '@/lib/locations';
import { useTranslations } from 'next-intl';

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
    const t = useTranslations('setup');
    const defaultCenter = defaultMapCenter || { lat: 14.0818, lng: -87.2068 };

    const [markerPos, setMarkerPos] = useState<{ lat: number; lng: number }>(
        initialLat && initialLng ? { lat: initialLat, lng: initialLng } : defaultCenter
    );
    const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>(
        initialLat && initialLng ? { lat: initialLat, lng: initialLng } : defaultCenter
    );
    const [inputValue, setInputValue] = useState(initialAddress || '');

    const mapRef = useRef<google.maps.Map | null>(null);
    const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
    const lastSentCoordsRef = useRef<{ lat: number, lng: number } | null>(
        initialLat && initialLng ? { lat: initialLat, lng: initialLng } : null
    );
    const prevCountryCodeRef = useRef(countryCode);

    useEffect(() => {
        if (countryCode && countryCode !== prevCountryCodeRef.current) {
            setInputValue('');
            lastSentCoordsRef.current = null;
            prevCountryCodeRef.current = countryCode;
        }
    }, [countryCode]);

    const handleGPS = () => {
        if (!navigator.geolocation) {
            toast.error(t('locationPicker.toastNoGeo'));
            return;
        }

        const toastId = toast.loading(t('locationPicker.toastGettingLoc'));
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                toast.dismiss(toastId);

                setMarkerPos({ lat, lng });

                let fallbackAddress = '';
                let fallbackCity = '';
                let fallbackDep = '';
                let fallbackCountry = '';
                let fallbackPlaceId = '';

                let isInsideCountry = true;
                let needsNominatim = false;

                try {
                    const geocoder = new window.google.maps.Geocoder();
                    const response = await geocoder.geocode({ location: { lat, lng } });

                    if (response.results && response.results.length > 0) {
                        const resultGeocode = response.results[0];
                        fallbackAddress = resultGeocode.formatted_address;
                        fallbackPlaceId = resultGeocode.place_id;

                        for (const res of response.results) {
                            const comps = res.address_components || [];
                            for (const comp of comps) {
                                if (comp.types.includes('locality') && !fallbackCity) fallbackCity = comp.long_name;
                                if (comp.types.includes('administrative_area_level_1') && !fallbackDep) fallbackDep = comp.long_name;
                                if (comp.types.includes('country') && !fallbackCountry) fallbackCountry = comp.short_name;
                            }
                        }

                        if (countryCode && fallbackCountry) {
                            if (fallbackCountry.toUpperCase() !== countryCode.toUpperCase()) {
                                isInsideCountry = false;
                            }
                        } else {
                            needsNominatim = true;
                        }
                    } else {
                        needsNominatim = true;
                    }
                } catch (err) {
                    console.error('Reverse geocode from GPS error:', err);
                    needsNominatim = true;
                }

                if (needsNominatim && countryCode) {
                    try {
                        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=3`);
                        if (res.ok) {
                            const data = await res.json();
                            if (data && data.address && data.address.country_code) {
                                const osmCountry = data.address.country_code.toUpperCase();
                                if (osmCountry !== countryCode.toUpperCase()) {
                                    isInsideCountry = false;
                                    fallbackCountry = osmCountry;
                                } else {
                                    isInsideCountry = true;
                                    fallbackAddress = fallbackAddress || t('locationPicker.fallbackRuralGps');
                                }
                            } else {
                                isInsideCountry = false;
                            }
                        } else {
                            isInsideCountry = false;
                        }
                    } catch (nomErr) {
                        console.error("Nominatim fallback error:", nomErr);
                        isInsideCountry = false;
                    }
                }

                if (!isInsideCountry) {
                    const detected = fallbackCountry ? fallbackCountry.toUpperCase() : t('locationPicker.unmappedArea');
                    toast.success(t('locationPicker.toastOutsideCountryGPS', { detected, countryCode: countryCode?.toUpperCase() || '' }), {
                        icon: '📍',
                        style: { background: '#F0FDF4', color: '#166534', borderColor: '#BBF7D0' }
                    });

                    const revertPos = lastSentCoordsRef.current || defaultCenter;
                    setMarkerPos(revertPos);
                    setMapCenter(revertPos);
                    mapRef.current?.panTo(revertPos);
                    return;
                }

                const finalDisplay = fallbackAddress || t('locationPicker.fallbackRuralGps');
                setInputValue(finalDisplay);
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
                    formattedAddress: finalDisplay,
                    displayAddress: finalDisplay,
                    googleMapsUrl: `https://maps.google.com/?q=${lat},${lng}`,
                    city: fallbackCity,
                    department: fallbackDep,
                    country: fallbackCountry || countryCode || '',
                    source: 'manual',
                    isConfirmed: true,
                };

                lastSentCoordsRef.current = { lat, lng };
                onLocationSelect(result);
                toast.success(t('locationPicker.toastGpsSuccess'));
            },
            (error) => {
                toast.dismiss(toastId);
                toast.error(t('locationPicker.toastGpsError'));
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

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

        let isInsideCountry = true;
        let needsNominatim = false;

        try {
            const geocoder = new window.google.maps.Geocoder();
            const response = await geocoder.geocode({ location: { lat, lng } });
            if (response.results && response.results.length > 0) {
                const resultGeocode = response.results[0];
                fallbackAddress = resultGeocode.formatted_address;
                fallbackPlaceId = resultGeocode.place_id;

                for (const res of response.results) {
                    const comps = res.address_components || [];
                    for (const comp of comps) {
                        if (comp.types.includes('locality') && !fallbackCity) fallbackCity = comp.long_name;
                        if (comp.types.includes('administrative_area_level_1') && !fallbackDep) fallbackDep = comp.long_name;
                        if (comp.types.includes('country') && !fallbackCountry) fallbackCountry = comp.short_name;
                    }
                }

                if (countryCode && fallbackCountry) {
                    if (fallbackCountry.toUpperCase() !== countryCode.toUpperCase()) {
                        isInsideCountry = false;
                    }
                } else {
                    needsNominatim = true;
                }
            } else {
                needsNominatim = true;
            }
        } catch (err) {
            console.error('Reverse geocode error or ZERO_RESULTS:', err);
            needsNominatim = true;
        }

        if (needsNominatim && countryCode) {
            try {
                const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=3`);
                if (res.ok) {
                    const data = await res.json();
                    if (data && data.address && data.address.country_code) {
                        const osmCountry = data.address.country_code.toUpperCase();
                        if (osmCountry !== countryCode.toUpperCase()) {
                            isInsideCountry = false;
                            fallbackCountry = osmCountry;
                        } else {
                            isInsideCountry = true;
                            fallbackAddress = fallbackAddress || t('locationPicker.fallbackRuralMap');
                        }
                    } else {
                        isInsideCountry = false;
                    }
                } else {
                    isInsideCountry = false;
                }
            } catch (nomErr) {
                console.error("Nominatim fallback error:", nomErr);
                isInsideCountry = false;
            }
        }

        if (!isInsideCountry) {
            const detected = fallbackCountry ? fallbackCountry.toUpperCase() : t('locationPicker.unmappedArea');
            toast.success(t('locationPicker.toastOutsideCountryMap', { detected, countryCode: countryCode?.toUpperCase() || '' }), {
                icon: '📍',
                style: { background: '#F0FDF4', color: '#166534', borderColor: '#BBF7D0' }
            });
            const revertPos = lastSentCoordsRef.current || defaultCenter;
            setMarkerPos(revertPos);
            setMapCenter(revertPos);
            mapRef.current?.panTo(revertPos);
            return;
        }

        setMarkerPos({ lat, lng });
        const finalAddressText = fallbackAddress || t('locationPicker.fallbackMapMark');
        setInputValue(finalAddressText);

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
            isConfirmed: true,
        };

        lastSentCoordsRef.current = { lat, lng };
        onLocationSelect(result);
        toast.success(t('locationPicker.toastMapSuccess'));
    }, [countryCode, onLocationSelect, defaultCenter, t]);

    const onPlaceChanged = useCallback(() => {
        if (!autocompleteRef.current) return;
        const place = autocompleteRef.current.getPlace();

        if (!place.geometry || !place.geometry.location) {
            return; // Usually happens when user hits Enter without picking a suggestion
        }

        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        const placeId = place.place_id || '';
        const formattedAddress = place.formatted_address || place.name || inputValue;

        let city = '';
        let department = '';
        let fallbackCountry = '';

        const comps = place.address_components || [];
        for (const comp of comps) {
            if (comp.types.includes('locality') && !city) city = comp.long_name;
            if (comp.types.includes('administrative_area_level_1') && !department) department = comp.long_name;
            if (comp.types.includes('country') && !fallbackCountry) fallbackCountry = comp.short_name;
        }

        if (countryCode && fallbackCountry && fallbackCountry.toUpperCase() !== countryCode.toUpperCase()) {
            toast.success(t('locationPicker.toastOutsideCountrySugg', { detected: fallbackCountry.toUpperCase(), countryCode: countryCode.toUpperCase() }), {
                icon: '📍',
                style: { background: '#F0FDF4', color: '#166534', borderColor: '#BBF7D0' }
            });
            const revertPos = lastSentCoordsRef.current || defaultCenter;
            setMarkerPos(revertPos);
            setMapCenter(revertPos);
            mapRef.current?.panTo(revertPos);
            setInputValue("");
            return;
        }

        setInputValue(formattedAddress);
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
            displayAddress: formattedAddress,
            formattedAddress,
            googleMapsUrl: place.url || `https://www.google.com/maps/place/?q=place_id:${placeId}`,
            city,
            department,
            country: fallbackCountry || countryCode || '',
            source: 'google',
            isConfirmed: true,
        };

        lastSentCoordsRef.current = pos;
        onLocationSelect(result);
    }, [countryCode, inputValue, onLocationSelect, defaultCenter, t]);

    return (
        <div className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
                <button
                    onClick={handleGPS}
                    type="button"
                    className="flex-shrink-0 flex items-center justify-center gap-2 h-12 px-4 rounded-lg font-medium bg-teal-50 text-teal-600 border border-teal-200 hover:bg-teal-100 hover:border-teal-300 transition-colors"
                >
                    <Navigation size={18} />
                    <span>{t('locationPicker.useMyLocationBtn')}</span>
                </button>

                <div className="relative w-full">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10">
                        <Search size={16} />
                    </div>
                    <Autocomplete
                        onLoad={(auto) => { autocompleteRef.current = auto; }}
                        onPlaceChanged={onPlaceChanged}
                        options={countryCode ? { componentRestrictions: { country: countryCode.toLowerCase() } } : undefined}
                    >
                        <input
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                }
                            }}
                            placeholder={t('locationPicker.searchPlaceholder')}
                            className="w-full h-12 bg-white border border-slate-200 rounded-lg pl-9 pr-9 text-slate-800 text-sm focus:outline-none focus:border-teal-500 placeholder:text-slate-400 disabled:opacity-50 inline-block focus:ring-0"
                        />
                    </Autocomplete>
                    {inputValue && (
                        <button
                            onClick={() => { setInputValue(''); }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 z-10"
                            type="button"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>
            </div>
            <div className="px-1 mt-1">
                <p className="text-xs text-slate-500 font-medium">{t('addressSearchHint')}</p>
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
                    <span>{t('locationPicker.pinWarnMsg')}</span>
                </div>
            )}
        </div>
    );
}

export function PlacesLocationPicker(props: Props) {
    const tStates = useTranslations('common.states');
    const tSetup = useTranslations('setup');
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
                    <h3 className="text-slate-800 font-medium text-sm">{tStates('loadingMap')}</h3>
                    <p className="text-slate-600 text-xs mt-1">{tSetup('locationPicker.mapLoadErrorWarn')}</p>
                </div>
            </div>
        );
    }

    if (!isLoaded) {
        return (
            <div className="flex items-center gap-2 text-slate-400 text-sm py-4">
                <Loader2 size={16} className="animate-spin text-teal-500" /> {tStates('loadingMap')}
            </div>
        );
    }

    return <PlacesLocationPickerInner key={props.countryCode || 'default'} {...props} />;
}
