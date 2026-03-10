const fs = require('fs');
const path = './src/components/business/setup/PlacesLocationPicker.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add fields to LocationResult interface
const interfaceRegex = /export interface LocationResult \{[\s\S]*?formattedAddress: string;/;
if (!content.includes('displayAddress?: string;')) {
    content = content.replace(interfaceRegex, (match) => {
        return match + '\n    displayAddress?: string;\n    plusCode?: string;';
    });
}

// 2. We need to overwrite handleSelect and handleMarkerDragEnd
// I'll rewrite both blocks fully to ensure safety and precision.

const handleSelectRegex = /\/\/ When user selects a suggestion from the dropdown\s*const handleSelect = useCallback\(async \(description: string, placeId: string\) => \{[\s\S]*?\}, \[setValue, clearSuggestions, onLocationSelect\]\);/;

const newHandleSelect = `    // When user selects a suggestion from the dropdown
    const handleSelect = useCallback(async (description: string, placeId: string) => {
        try {
            // Instantly update UI for immediate UX feedback
            setValue(description, false);
            clearSuggestions();

            const getPlaceDetails = (pId: string): Promise<google.maps.places.PlaceResult> => {
                return new Promise((resolve, reject) => {
                    const dmy = document.createElement('div');
                    const service = new window.google.maps.places.PlacesService(mapRef.current ? (mapRef.current.getDiv() as HTMLDivElement) : dmy);
                    // Solicitamos plus_code y formatted_address
                    service.getDetails({ placeId: pId, fields: ['geometry', 'address_components', 'plus_code', 'formatted_address'] }, (place, status) => {
                        if (status === window.google.maps.places.PlacesServiceStatus.OK && place) resolve(place);
                        else reject(new Error('PlacesService failed with status: ' + status));
                    });
                });
            };

            let lat: number;
            let lng: number;
            let comps: any[] = [];
            let plusCode = '';
            let formattedAddress = '';

            try {
                // PRIMARIO: Usar directamente la geometría proveída por Places API sin llamar a Geocoder
                if (!placeId) throw new Error("No placeId provided");
                const place = await getPlaceDetails(placeId);
                if (!place.geometry || !place.geometry.location) throw new Error("Place object has no geometry");

                lat = place.geometry.location.lat();
                lng = place.geometry.location.lng();
                comps = place.address_components || [];
                if (place.plus_code && place.plus_code.global_code) plusCode = place.plus_code.global_code;
                if (place.formatted_address) formattedAddress = place.formatted_address;
            } catch (err) {
                console.warn('Obtener geometry desde Places falló, usando native Geocoder como fallback manual:', err);
                
                // FALLBACK SOLO PARA DIRECCIONES MANUALES SIN SUGERENCIA GOOGLE O FALLAS DE PLACES
                const geocoder = new window.google.maps.Geocoder();
                const response = await geocoder.geocode({ address: description });
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
                googleMapsUrl: \`https://www.google.com/maps/place/?q=place_id:\${placeId}\`,
                city,
                department,
                country,
                source: 'google',
                isConfirmed: true, // Habilita el botón "Continuar" sin errores falsos
            };

            lastConfirmedPlaceIdRef.current = placeId;
            lastSentCoordsRef.current = pos;
            isInternalUpdateRef.current = true;
            onLocationSelect(result);

        } catch (err: any) {
            console.error('PlacesLocationPicker handleSelect error:', err);
            toast.error('Google no pudo confirmar la coordenada visualmente. Asegúrate de que el pin esté correcto.');
        }
    }, [setValue, clearSuggestions, onLocationSelect]);`;

if (handleSelectRegex.test(content)) {
    content = content.replace(handleSelectRegex, newHandleSelect);
} 

// 3. Rewrite handleMarkerDragEnd to correctly pass displayAddress and plusCode
const handleMarkerDragEndRegex = /\/\/ When user drags the marker to a new position\s*const handleMarkerDragEnd = useCallback\(async \(e: google.maps.MapMouseEvent\) => \{[\s\S]*?\}, \[value, initialAddress, cityContext, countryCode, onLocationSelect, setValue\]\);/;

const newDragEnd = `    // When user drags the marker to a new position
    const handleMarkerDragEnd = useCallback(async (e: google.maps.MapMouseEvent) => {
        if (!e.latLng) return;
        const lat = e.latLng.lat();
        const lng = e.latLng.lng();
        setMarkerPos({ lat, lng });

        // User intent rule: Google sets initial address, drag refines pure lat/lng
        const finalAddressText = value || initialAddress || '';
        const finalPlaceId = lastConfirmedPlaceIdRef.current || '';

        let fallbackAddress = '';
        let fallbackCity = '';
        let fallbackDep = '';
        let fallbackCountry = '';
        let fallbackPlaceId = '';
        let fallbackPlusCode = '';

        // Only do reverse geocode if the user dragged without *any* prior address text
        if (!finalAddressText) {
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
                    setValue(fallbackAddress, false);
                }
            } catch (err) {
                console.error('Reverse geocode error:', err);
            }
        }

        const result: LocationResult = {
            lat,
            lng,
            placeId: finalAddressText ? finalPlaceId : fallbackPlaceId,
            displayAddress: finalAddressText || fallbackAddress,
            // we send finalAddressText as formattedAddress as fallback, if it was already selected it stays
            formattedAddress: finalAddressText || fallbackAddress, 
            plusCode: fallbackPlusCode, // Si había una previa, backend mantendrá la previa o nullificará si se movió mucho.
            googleMapsUrl: (finalAddressText && finalPlaceId)
                ? \`https://www.google.com/maps/place/?q=place_id:\${finalPlaceId}\`
                : \`https://maps.google.com/?q=\${lat},\${lng}\`,
            city: cityContext ? cityContext.split(',')[0] : fallbackCity,
            department: cityContext ? cityContext.split(',')[1]?.trim() : fallbackDep,
            country: countryCode || fallbackCountry,
            source: 'manual',
            isConfirmed: true,
        };

        lastSentCoordsRef.current = { lat, lng };
        isInternalUpdateRef.current = true;
        onLocationSelect(result);

        toast.success('Precisión de ubicación ajustada manualmente.');
    }, [value, initialAddress, cityContext, countryCode, onLocationSelect, setValue]);`;

if (handleMarkerDragEndRegex.test(content)) {
    content = content.replace(handleMarkerDragEndRegex, newDragEnd);
}

// 4. Update the manual verify button (Usar esta ubicación)
const manualVerifyRegex = /const result: LocationResult = \{\s*lat: finalLat,[\s\S]*?isConfirmed: true, \/\/ UNBLOCK CONTINUAR\s*\};/;
const newManualVerify = `const result: LocationResult = {
                            lat: finalLat,
                            lng: finalLng,
                            placeId: '',
                            displayAddress: targetAddress,
                            formattedAddress: targetAddress,
                            plusCode: '',
                            googleMapsUrl: \`https://maps.google.com/?q=\${finalLat},\${finalLng}\`,
                            city: finalCity,
                            department: finalDepartment,
                            country: finalCountry,
                            source: 'manual',
                            isConfirmed: true, // UNBLOCK CONTINUAR
                        };`;

if (manualVerifyRegex.test(content)) {
    content = content.replace(manualVerifyRegex, newManualVerify);
}

fs.writeFileSync(path, content, 'utf8');
console.log('Done Picker Separations');
