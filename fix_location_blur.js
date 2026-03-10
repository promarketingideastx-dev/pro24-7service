const fs = require('fs');
const filepath = './src/components/business/setup/PlacesLocationPicker.tsx';
let content = fs.readFileSync(filepath, 'utf8');

// 1. Add ref
if (!content.includes('const lastConfirmedTextRef = useRef<string>')) {
    content = content.replace(
        'const lastSentCoordsRef = useRef<{ lat: number, lng: number } | null>(null);',
        `const lastSentCoordsRef = useRef<{ lat: number, lng: number } | null>(null);\n    const lastConfirmedTextRef = useRef<string>(initialAddress || '');`
    );
}

// 2. Update handleSelect
const selectMarker = 'lastConfirmedPlaceIdRef.current = placeId;';
if (content.includes(selectMarker)) {
    content = content.replace(
        selectMarker,
        `lastConfirmedPlaceIdRef.current = placeId;\n            lastConfirmedTextRef.current = description;`
    );
}

// 3. Update onClick Usar esta ubicacion
const onClickMarker = 'lastSentCoordsRef.current = { lat: finalLat, lng: finalLng };';
if (content.includes(onClickMarker)) {
    content = content.replace(
        onClickMarker,
        `lastSentCoordsRef.current = { lat: finalLat, lng: finalLng };\n                                lastConfirmedTextRef.current = targetAddress;`
    );
}

// 4. Update onBlur
const onBlurRegex = /if \(e\.target\.value && e\.target\.value !== initialAddress\) \{/g;
if (content.match(onBlurRegex)) {
    content = content.replace(
        onBlurRegex,
        `if (e.target.value && e.target.value !== initialAddress && e.target.value !== lastConfirmedTextRef.current) {`
    );
}

fs.writeFileSync(filepath, content, 'utf8');
console.log("Updated onBlur state unmounting bug.");
