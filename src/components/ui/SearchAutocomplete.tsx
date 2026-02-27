'use client';

import { useMemo } from 'react';
import { Search, Building2, Wrench, Sparkles, Tag, X } from 'lucide-react';
import { TAXONOMY } from '@/lib/taxonomy';
import { normalizeText } from '@/lib/searchUtils';

export interface AutocompleteSuggestion {
    type: 'business' | 'category' | 'subcategory' | 'specialty';
    label: string;
    sublabel?: string;
    icon?: string;
}

interface Props {
    query: string;
    businesses: any[];
    locale: 'es' | 'en' | 'pt';
    onSelect: (value: string) => void;
    onClose: () => void;
}

function getTagText(tag: any): string {
    if (typeof tag === 'string') return tag;
    return tag?.es || tag?.en || tag?.pt || '';
}

export default function SearchAutocomplete({ query, businesses, locale, onSelect, onClose }: Props) {
    const suggestions = useMemo(() => {
        const q = normalizeText(query.trim());
        if (q.length < 2) return [];

        const results: AutocompleteSuggestion[] = [];
        const seen = new Set<string>();

        const add = (s: AutocompleteSuggestion) => {
            const key = `${s.type}:${s.label}`;
            if (!seen.has(key)) {
                seen.add(key);
                results.push(s);
            }
        };

        // ── 1. Business names ─────────────────────────────────────────────
        businesses.forEach(b => {
            if (normalizeText(b.name || '').includes(q)) {
                add({
                    type: 'business',
                    label: b.name,
                    sublabel: b.category ? TAXONOMY[b.category as keyof typeof TAXONOMY]?.label?.[locale] : undefined,
                });
            }
        });

        // ── 2. Categories ─────────────────────────────────────────────────
        Object.values(TAXONOMY).forEach(cat => {
            const catLabel = cat.label[locale] || cat.label.es;
            if (normalizeText(catLabel).includes(q)) {
                add({ type: 'category', label: catLabel, sublabel: 'Categoría' });
            }

            // ── 3. Subcategories ──────────────────────────────────────────
            cat.subcategories.forEach(sub => {
                const subLabel = sub.label[locale] || sub.label.es;
                if (normalizeText(subLabel).includes(q)) {
                    add({ type: 'subcategory', label: subLabel, sublabel: catLabel });
                }

                // ── 4. Specialties ────────────────────────────────────────
                sub.specialties.forEach((spec: any) => {
                    const specLabel = typeof spec === 'string' ? spec : (spec[locale] || spec.es || '');
                    if (normalizeText(specLabel).includes(q)) {
                        add({ type: 'specialty', label: specLabel, sublabel: subLabel });
                    }
                });
            });
        });

        return results.slice(0, 8); // Max 8 suggestions
    }, [query, businesses, locale]);

    if (suggestions.length === 0) return null;

    const typeIcon = (type: AutocompleteSuggestion['type']) => {
        if (type === 'business') return <Building2 size={14} className="text-teal-500 shrink-0" />;
        if (type === 'category') return <Tag size={14} className="text-blue-500 shrink-0" />;
        if (type === 'subcategory') return <Wrench size={14} className="text-orange-500 shrink-0" />;
        return <Sparkles size={14} className="text-pink-500 shrink-0" />;
    };

    const typeLabel = (type: AutocompleteSuggestion['type']) => {
        if (type === 'business') return 'negocio';
        if (type === 'category') return 'categoría';
        if (type === 'subcategory') return 'servicio';
        return 'especialidad';
    };

    // Highlight matched text
    const highlight = (text: string) => {
        const idx = normalizeText(text).indexOf(normalizeText(query.trim()));
        if (idx === -1) return <span>{text}</span>;
        return (
            <span>
                {text.slice(0, idx)}
                <mark className="bg-teal-100 text-teal-800 rounded px-0.5 not-italic">{text.slice(idx, idx + query.trim().length)}</mark>
                {text.slice(idx + query.trim().length)}
            </span>
        );
    };

    return (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100 bg-slate-50">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Sugerencias</span>
                <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-200 text-slate-400 transition-colors">
                    <X size={12} />
                </button>
            </div>

            {/* Suggestions List */}
            <ul className="max-h-72 overflow-y-auto">
                {suggestions.map((s, i) => (
                    <li key={i}>
                        <button
                            onMouseDown={(e) => { e.preventDefault(); onSelect(s.label); }}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-teal-50 transition-colors text-left group"
                        >
                            <div className="w-7 h-7 rounded-lg bg-slate-100 group-hover:bg-white flex items-center justify-center transition-colors shrink-0">
                                {typeIcon(s.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-slate-900 truncate">
                                    {highlight(s.label)}
                                </p>
                                {s.sublabel && (
                                    <p className="text-xs text-slate-400 truncate">{s.sublabel}</p>
                                )}
                            </div>
                            <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full shrink-0 capitalize">
                                {typeLabel(s.type)}
                            </span>
                        </button>
                    </li>
                ))}
            </ul>

            {/* Footer */}
            <div className="px-4 py-2 border-t border-slate-100 bg-slate-50 flex items-center gap-2">
                <Search size={12} className="text-slate-400" />
                <span className="text-xs text-slate-400">
                    Presiona Enter para buscar <strong className="text-slate-600">"{query}"</strong>
                </span>
            </div>
        </div>
    );
}
