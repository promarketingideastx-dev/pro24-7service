const fs = require('fs');
const path = './src/components/business/setup/PlacesLocationPicker.tsx';
let content = fs.readFileSync(path, 'utf8');

// The new function definition to insert
const newHandleSelect = `    // When user selects a suggestion from the dropdown
    const handleSelect = useCallback(async (description: string, placeId: string) => {
        try {
            // Instantly update UI for immediate UX feedback
            setValue(description, false);
            clearSuggestions();

            // Usamos el Geocoder nativo para evitar fallas silenciosas de la librería use-places-autocomplete en regiones ambiguas
            const geocoder = new window.google.maps.Geocoder();
            let resultGeocode: google.maps.GeocoderResult | null = null;

            try {
                const response = await geocoder.geocode({ placeId: placeId });
                if (response.results && response.results.length > 0) {
                    resultGeocode = response.results[0];
                }
            } catch (err) {
                console.warn('Native Geocode by placeId failed, falling back to description:', err);
                try {
                    const response = await geocoder.geocode({ address: description });
                    if (response.results && response.results.length > 0) {
                        resultGeocode = response.results[0];
                    }
                } catch (fallbackErr) {
                    throw new Error("Geocoding API falló en resolver esta dirección.");
                }
            }

            if (!resultGeocode) {
                throw new Error("No se obtuvieron resultados geográficos válidos.");
            }

            const lat = resultGeocode.geometry.location.lat();
            const lng = resultGeocode.geometry.location.lng();

            let city = '';
            let department = '';
            let country = '';
            const comps = resultGeocode.address_components || [];
            for (const comp of comps) {
                if (comp.types.includes('locality')) city = comp.long_name;
                if (comp.types.includes('administrative_area_level_1')) department = comp.long_name;
                if (comp.types.includes('country')) country = comp.short_name;
            }

            // [FUNDAMENTAL FIX]: La dirección resuelta se vuelve la FUENTE DE VERDAD ABSOLUTA
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
                formattedAddress: description,
                googleMapsUrl: \`https://www.google.com/maps/place/?q=place_id:\${placeId}\`,
                city,
                department,
                country,
                source: 'google',
                isConfirmed: true, // Habilita el botón "Continuar"
            };

            lastSentCoordsRef.current = pos;
            isInternalUpdateRef.current = true;
            onLocationSelect(result);

            toast.success('Ubicación confirmada automáticamente por Google.');

        } catch (err: any) {
            console.error('PlacesLocationPicker native geocode error:', err);
            // [CAMBIO CRÍTICO]: Si no hay resolución válida, NO hacemos commit silencioso con coordenadas viejas.
            toast.error('Google no pudo resolver la coordenada exacta. Por favor arrastra el pin manualmente o usa el botón "Usar esta ubicación".');
        }
    }, [setValue, clearSuggestions, onLocationSelect, markerPos, cityContext, countryCode]);`;

// Regex replacement from handleSelect declaration to its end
const handleSelectRegex = /\/\/ When user selects a suggestion from the dropdown\s*const handleSelect = useCallback\(async \(description: string, placeId: string\) => \{[\s\S]*?\}, \[setValue, clearSuggestions, onLocationSelect, markerPos, cityContext, countryCode\]\);/;

content = content.replace(handleSelectRegex, newHandleSelect);
fs.writeFileSync(path, content, 'utf8');
console.log('Update applied');
