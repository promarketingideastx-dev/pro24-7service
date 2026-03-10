const fs = require('fs');
const path = './src/components/business/setup/PlacesLocationPicker.tsx';
let content = fs.readFileSync(path, 'utf8');

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
                    service.getDetails({ placeId: pId, fields: ['geometry', 'address_components'] }, (place, status) => {
                        if (status === window.google.maps.places.PlacesServiceStatus.OK && place) resolve(place);
                        else reject(new Error('PlacesService failed with status: ' + status));
                    });
                });
            };

            let lat: number;
            let lng: number;
            let comps: any[] = [];

            try {
                // PRIMARIO: Usar directamente la geometría proveída por Places API sin llamar a Geocoder
                if (!placeId) throw new Error("No placeId provided");
                const place = await getPlaceDetails(placeId);
                if (!place.geometry || !place.geometry.location) throw new Error("Place object has no geometry");

                lat = place.geometry.location.lat();
                lng = place.geometry.location.lng();
                comps = place.address_components || [];
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
                formattedAddress: description,
                googleMapsUrl: \`https://www.google.com/maps/place/?q=place_id:\${placeId}\`,
                city,
                department,
                country,
                source: 'google',
                isConfirmed: true, // Habilita el botón "Continuar" sin errores falsos
            };

            lastSentCoordsRef.current = pos;
            isInternalUpdateRef.current = true;
            onLocationSelect(result);

        } catch (err: any) {
            console.error('PlacesLocationPicker handleSelect error:', err);
            toast.error('Google no pudo confirmar la coordenada visualmente. Asegúrate de que el pin esté correcto.');
        }
    }, [setValue, clearSuggestions, onLocationSelect]);`;

// Regex replacement
const handleSelectRegex = /\/\/ When user selects a suggestion from the dropdown\s*const handleSelect = useCallback\(async \(description: string, placeId: string\) => \{[\s\S]*?\}, \[setValue, clearSuggestions, onLocationSelect, markerPos, cityContext, countryCode\]\);/;

content = content.replace(handleSelectRegex, newHandleSelect);
fs.writeFileSync(path, content, 'utf8');
console.log('Update applied - direct geometry fix');
