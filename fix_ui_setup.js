const fs = require('fs');

/* 1. PlacesLocationPicker.tsx */
const pickerPath = './src/components/business/setup/PlacesLocationPicker.tsx';
let pickerContent = fs.readFileSync(pickerPath, 'utf8');

// A. Imports
if (pickerContent.includes('import { MapPin, Loader2, Search, X, Check } from \'lucide-react\';')) {
    pickerContent = pickerContent.replace(
        'import { MapPin, Loader2, Search, X, Check } from \'lucide-react\';',
        'import { MapPin, Loader2, Search, X, Check, AlertTriangle } from \'lucide-react\';'
    );
}

// B. Load Error Container
const oldError = `    if (loadError) {
        return (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-500 text-sm">
                Error al cargar Google Maps. Verifica tu API Key o conexión: {loadError.message}
            </div>
        );
    }`;
const newError = `    if (loadError) {
        return (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex items-start gap-3 shadow-sm">
                <AlertTriangle size={20} className="text-red-500 shrink-0 mt-0.5" />
                <div>
                    <h3 className="text-red-800 font-medium text-sm">Error al cargar mapas de Google</h3>
                    <p className="text-red-600/90 text-xs mt-1 leading-relaxed">Verifica tu conexión a internet o contacta a soporte técnico si este problema persiste. ({loadError.message})</p>
                </div>
            </div>
        );
    }`;
if (pickerContent.includes(oldError)) {
    pickerContent = pickerContent.replace(oldError, newError);
}

// C. Condicional de Map e Instrucciones
// In PlacesLocationPickerInner, we add isMapRelevant
const isInternalUpdateRefRegex = /const isInternalUpdateRef = useRef\(false\);/;
if (pickerContent.match(isInternalUpdateRefRegex) && !pickerContent.includes('const isMapReady')) {
    pickerContent = pickerContent.replace(
        isInternalUpdateRefRegex,
        `const isMapReady = Boolean(cityContext || initialLat || value);\n    const isInternalUpdateRef = useRef(false);`
    );
}

// Now wrap the instructions
const buttonConfirmBlockStart = `{/* Botón de Confirmación Manual (Respuesta directa al bloqueo de UX) */}`;
const mapBlockStart = `{/* Map with draggable marker */}`;

// Extract the chunk from `buttonConfirmBlockStart` up to `mapBlockStart`
let instructionChunkRegex = /\{\/\* Botón de Confirmación Manual[\s\S]*?\{\/\* Map with draggable marker \*\/\}/;
if (pickerContent.match(instructionChunkRegex)) {
    pickerContent = pickerContent.replace(
        instructionChunkRegex,
        (match) => {
            // Remove the /* Map with draggable marker */ comment from the match because we need to insert it after the wrapper
            let inner = match.replace(`            {/* Map with draggable marker */}`, '');
            return `            {isMapReady && (
                <div className="space-y-3 mt-4">
        ${inner}
                </div>
            )}
            {/* Map with draggable marker */}`;
        }
    );
}

// Also conditionally dull the map
const googleMapDivRegex = /<div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm relative mt-3">/;
if (pickerContent.match(googleMapDivRegex)) {
    pickerContent = pickerContent.replace(
        googleMapDivRegex,
        `<div className={\`rounded-xl overflow-hidden border border-slate-200 shadow-sm relative mt-4 transition-opacity \${!isMapReady ? 'opacity-40 grayscale pointer-events-none' : 'opacity-100'}\`}>`
    );
}

fs.writeFileSync(pickerPath, pickerContent, 'utf8');

/* 2. setup/page.tsx */
const setupPath = './src/app/[locale]/business/setup/page.tsx';
let setupContent = fs.readFileSync(setupPath, 'utf8');

const oldModality = `                                    <button
                                        key={m}
                                        onClick={() => setFormData({ ...formData, modality: m as any })}
                                        className={\`h-10 rounded border text-sm font-medium transition-colors
                                            \${formData.modality === m
                                                ? 'bg-teal-500/20 border-teal-500 text-white'
                                                : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                                            }
                                        \`}
                                    >
                                        {m === 'local' ? 'En Local' : m === 'home' ? 'A Domicilio' : 'Ambos'}
                                    </button>`;

const newModality = `                                    <button
                                        key={m}
                                        onClick={() => setFormData({ ...formData, modality: m as any })}
                                        className={\`h-11 rounded-lg border text-sm font-medium transition-all duration-200 active:scale-95
                                            \${formData.modality === m
                                                ? 'bg-teal-600 border-teal-600 text-white shadow-sm shadow-teal-500/20'
                                                : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                                            }
                                        \`}
                                    >
                                        {m === 'local' ? 'En Local' : m === 'home' ? 'A Domicilio' : 'Ambas'}
                                    </button>`;

if (setupContent.includes('bg-teal-500/20 border-teal-500 text-white')) {
    // Replace all using regex global if there are multiple, but there is only 1 map
    const modRegex = /<button[\s\S]*?bg-teal-500\/20 border-teal-500 text-white[\s\S]*?<\/button>/g;
    setupContent = setupContent.replace(modRegex, newModality);
}

fs.writeFileSync(setupPath, setupContent, 'utf8');
console.log('UI Fixes applied');
