const fs = require('fs');
const path = './src/components/business/setup/PlacesLocationPicker.tsx';
let content = fs.readFileSync(path, 'utf8');

// I see at line 467 there are some hanging divs. 
// "                Arrastra el pin rojo exactamente al punto donde está tu negocio."
// "            </div>"
// ""
// ""
// "                </div>"
// "            )}"

// I will fix the entire instruction wrapper section manually with a clean replace to ensure it's exact valid JSX.

const badChunkRegex = /\{isMapReady && \([\s\S]*?\}\)/;

const fixedChunk = `{isMapReady && (
                <div className="space-y-3 mt-4">
                    {/* Botón de Confirmación Manual */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-teal-50/50 p-3 rounded-xl border border-teal-100">
                        <p className="text-xs text-slate-600 flex items-center gap-1.5 flex-1">
                            <MapPin size={14} className="text-teal-600 shrink-0" />
                            <span>Arrastra el pin rojo al punto exacto, o confirma tu búsqueda manual:</span>
                        </p>
                        <button
                            type="button"
                            onClick={async () => {
                                const targetAddress = value || initialAddress || cityContext || '';
                                let finalLat = markerPos.lat;
                                let finalLng = markerPos.lng;
                                let finalCity = cityContext ? cityContext.split(',')[0] : '';
                                let finalDepartment = cityContext ? cityContext.split(',')[1]?.trim() : '';
                                let finalCountry = countryCode || '';

                                // 1. Intentar validar y anclar la coordenada geográficamente
                                if (targetAddress) {
                                    try {
                                        const results = await getGeocode({ address: targetAddress });
                                        if (results && results.length > 0) {
                                            const coords = await getLatLng(results[0]);
                                            finalLat = coords.lat;
                                            finalLng = coords.lng;

                                            const comps = results[0].address_components || [];
                                            for (const comp of comps) {
                                                if (comp.types.includes('locality')) finalCity = comp.long_name;
                                                if (comp.types.includes('administrative_area_level_1')) finalDepartment = comp.long_name;
                                                if (comp.types.includes('country')) finalCountry = comp.short_name;
                                            }

                                            // 2. Anclar visualmente el mapa y el marker a las verdaderas coordenadas
                                            setMarkerPos({ lat: finalLat, lng: finalLng });
                                            setMapCenter({ lat: finalLat, lng: finalLng });
                                            if (mapRef.current) {
                                                mapRef.current.panTo({ lat: finalLat, lng: finalLng });
                                                mapRef.current.setZoom(17);
                                            }
                                        }
                                    } catch (e) {
                                        console.warn('Silently falling back to current marker pos for manual confirm:', e);
                                    }
                                }

                                // 3. Force manual commit explicitly con las coordenadas validadas
                                const result: LocationResult = {
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
                                };
                                lastSentCoordsRef.current = { lat: finalLat, lng: finalLng };
                                isInternalUpdateRef.current = true;
                                onLocationSelect(result);
                                toast.success('Ubicación confirmada manualmente');
                            }}
                            className="shrink-0 bg-teal-600 hover:bg-teal-700 text-white px-4 py-1.5 rounded-lg text-sm font-medium shadow-sm transition-colors active:scale-95 flex items-center gap-1.5"
                        >
                            <Check size={14} /> Usar esta ubicación
                        </button>
                    </div>

                    {/* Helper visual para enfocar en la precisión manual */}
                    <div className="text-sm text-teal-800 bg-teal-50 border border-teal-200 p-3 rounded-lg flex items-center gap-3 font-medium shadow-sm transition-all animate-in fade-in zoom-in slide-in-from-bottom-2 duration-300">
                        <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center shrink-0">
                            <MapPin size={18} className="text-teal-600" />
                        </div>
                        Arrastra el pin rojo exactamente al punto donde está tu negocio.
                    </div>
                </div>
            )}`;

if (content.match(badChunkRegex)) {
    content = content.replace(badChunkRegex, fixedChunk);
}

fs.writeFileSync(path, content, 'utf8');
console.log('Done mapping.');
