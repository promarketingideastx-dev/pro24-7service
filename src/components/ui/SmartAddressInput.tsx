'use client';

import { useRef } from 'react';
import usePlacesAutocomplete, { getGeocode } from 'use-places-autocomplete';
import { MapPin, X } from 'lucide-react';

interface Props {
    value: string;
    onChange: (address: string) => void;
    placeholder?: string;
    className?: string;
    disabled?: boolean;
}

/**
 * Text input with Google Places autocomplete suggestions.
 * Does NOT include a map — only fills the address text.
 * Requires Google Maps JS API to be loaded (e.g., by PlacesLocationPicker on the same page).
 */
export default function SmartAddressInput({ value, onChange, placeholder, className, disabled }: Props) {
    const containerRef = useRef<HTMLDivElement>(null);

    const {
        ready,
        value: inputVal,
        suggestions: { status, data },
        setValue,
        clearSuggestions,
    } = usePlacesAutocomplete({
        requestOptions: { componentRestrictions: { country: [] } },
        debounce: 300,
        defaultValue: value,
    });

    const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const v = e.target.value;
        setValue(v);
        onChange(v); // keep parent formData in sync even while typing
    };

    const handleSelect = async (description: string) => {
        setValue(description, false);
        clearSuggestions();
        onChange(description);
    };

    const handleClear = () => {
        setValue('');
        clearSuggestions();
        onChange('');
    };

    return (
        <div ref={containerRef} className="relative">
            <input
                type="text"
                value={inputVal}
                onChange={handleInput}
                onBlur={() => setTimeout(clearSuggestions, 200)}
                disabled={!ready || disabled}
                placeholder={placeholder || 'Ej: Pasaje Valle Local #50…'}
                className={className || 'w-full bg-[#F4F6F8] border border-slate-200 rounded-lg px-4 py-2 text-slate-900 focus:border-brand-neon-cyan focus:outline-none'}
            />
            {inputVal && (
                <button
                    type="button"
                    onClick={handleClear}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                    <X size={14} />
                </button>
            )}

            {/* Suggestions dropdown */}
            {status === 'OK' && data.length > 0 && (
                <ul className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
                    {data.slice(0, 5).map(({ place_id, description }) => (
                        <li
                            key={place_id}
                            onMouseDown={(e) => { e.preventDefault(); handleSelect(description); }}
                            className="flex items-start gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-blue-50 cursor-pointer border-b border-slate-100 last:border-0 transition-colors"
                        >
                            <MapPin size={14} className="text-blue-500 mt-0.5 shrink-0" />
                            <span>{description}</span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
