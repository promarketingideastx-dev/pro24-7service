const fs = require('fs');
const path = './src/components/business/setup/PlacesLocationPicker.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add `lastConfirmedPlaceIdRef` inside the component
if (!content.includes('lastConfirmedPlaceIdRef')) {
    content = content.replace(
        `const lastSentCoordsRef = useRef<{lat: number, lng: number} | null>(null);`,
        `const lastSentCoordsRef = useRef<{lat: number, lng: number} | null>(null);\n    const lastConfirmedPlaceIdRef = useRef<string>('');`
    );
}

// 2. Add assignment to `lastConfirmedPlaceIdRef.current` inside `handleSelect`
const handleSelectMarker = `lastSentCoordsRef.current = pos;`;
if (!content.includes('lastConfirmedPlaceIdRef.current = placeId;')) {
    content = content.replace(
        handleSelectMarker,
        `lastConfirmedPlaceIdRef.current = placeId;\n            lastSentCoordsRef.current = pos;`
    );
}

// 3. Rewrite handleMarkerDragEnd
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

        // Only do reverse geocode if the user dragged without *any* prior address text
        if (!finalAddressText) {
            try {
                const geocoder = new window.google.maps.Geocoder();
                const response = await geocoder.geocode({ location: { lat, lng } });
                if (response.results && response.results.length > 0) {
                    const resultGeocode = response.results[0];
                    fallbackAddress = resultGeocode.formatted_address;
                    fallbackPlaceId = resultGeocode.place_id;

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
            formattedAddress: finalAddressText || fallbackAddress,
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

const handleMarkerDragEndRegex = /\/\/ When user drags the marker to a new position\s*const handleMarkerDragEnd = useCallback\(async \(e: google.maps.MapMouseEvent\) => \{[\s\S]*?\}, \[value, initialAddress, cityContext, countryCode, onLocationSelect, setValue\]\);/;
if (handleMarkerDragEndRegex.test(content)) {
    content = content.replace(handleMarkerDragEndRegex, newDragEnd);
} else {
    // Escala el regex si las dependencias eran distintas
    const fallbackRegex = /\/\/ When user drags the marker to a new position\s*const handleMarkerDragEnd = useCallback\(async \(e: google.maps.MapMouseEvent\) => \{[\s\S]*?toast\.success\('Ubicación confirmada manualmente'\);\s*\} catch \(err\) \{[\s\S]*?\}\s*\}, \[.*?\]\);/;
    content = content.replace(fallbackRegex, newDragEnd);
}


// 4. Update the UI string and instructions
// Replacing the old text instruction inside the manual confirm section just to clean it up slightly
// and inserting the large Helper label right above the Map.

const mapDivMarker = `            {/* Map with draggable marker */}
            <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm relative">`;

const newMapDivMarker = `            {/* Helper visual para enfocar en la precisión manual */}
            <div className="text-sm text-teal-800 bg-teal-50 border border-teal-200 p-3 rounded-lg flex items-center gap-3 font-medium shadow-sm transition-all animate-in fade-in zoom-in slide-in-from-bottom-2 duration-300">
                <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center shrink-0">
                    <MapPin size={18} className="text-teal-600" />
                </div>
                Arrastra el pin rojo exactamente al punto donde está tu negocio.
            </div>

            {/* Map with draggable marker */}
            <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm relative mt-3">`;

content = content.replace(mapDivMarker, newMapDivMarker);

fs.writeFileSync(path, content, 'utf8');
console.log('Update precision text applied');
