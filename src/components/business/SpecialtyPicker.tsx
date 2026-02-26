'use client';

import { TAXONOMY } from '@/lib/taxonomy';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { useLocale } from 'next-intl';

interface SpecialtyPickerProps {
    /** Main category id (e.g. 'art_design') */
    categoryId: string;
    /** Currently selected subcategory ids (max 3) */
    selectedSubcategories: string[];
    /** Map of subcategoryId → selected specific service names (stored as .es key) */
    specialtiesBySubcategory: Record<string, string[]>;
    onChange: (subcategories: string[], specialtiesBySubcategory: Record<string, string[]>) => void;
    /** Max subcategories selectable (default 3) */
    maxSubcategories?: number;
}

export default function SpecialtyPicker({
    categoryId,
    selectedSubcategories,
    specialtiesBySubcategory,
    onChange,
    maxSubcategories = 3,
}: SpecialtyPickerProps) {
    const locale = useLocale();
    const lang = locale === 'pt-BR' ? 'pt' : locale === 'en' ? 'en' : 'es';
    const [expandedSubs, setExpandedSubs] = useState<Set<string>>(new Set(selectedSubcategories));

    const categoryData = TAXONOMY[categoryId as keyof typeof TAXONOMY];
    if (!categoryData) return null;

    const getLabel = (labelObj: any) => labelObj?.[lang] ?? labelObj?.es ?? '';

    const toggleSubcategory = (subId: string) => {
        const isSelected = selectedSubcategories.includes(subId);
        let newSubs: string[];
        let newMap = { ...specialtiesBySubcategory };

        if (isSelected) {
            // Deselect: remove sub and its specialties
            newSubs = selectedSubcategories.filter(id => id !== subId);
            delete newMap[subId];
            // Collapse
            const ex = new Set(expandedSubs);
            ex.delete(subId);
            setExpandedSubs(ex);
        } else {
            // Select if under limit
            if (selectedSubcategories.length >= maxSubcategories) return;
            newSubs = [...selectedSubcategories, subId];
            newMap[subId] = newMap[subId] || [];
            // Auto-expand on select
            setExpandedSubs(prev => new Set(Array.from(prev).concat(subId)));
        }

        onChange(newSubs, newMap);
    };

    const toggleSpecificService = (subId: string, specEs: string) => {
        const currentSpecs = specialtiesBySubcategory[subId] || [];
        const isSelected = currentSpecs.includes(specEs);
        const newSpecs = isSelected
            ? currentSpecs.filter(s => s !== specEs)
            : [...currentSpecs, specEs];

        onChange(selectedSubcategories, {
            ...specialtiesBySubcategory,
            [subId]: newSpecs,
        });
    };

    const toggleExpand = (subId: string) => {
        setExpandedSubs(prev => {
            const next = new Set(prev);
            if (next.has(subId)) next.delete(subId);
            else next.add(subId);
            return next;
        });
    };

    return (
        <div className="space-y-2">
            {/* Subcategories grid */}
            <div className="grid grid-cols-2 gap-2">
                {categoryData.subcategories.map(sub => {
                    const isSelected = selectedSubcategories.includes(sub.id);
                    const isExpanded = expandedSubs.has(sub.id);
                    const selectedCount = (specialtiesBySubcategory[sub.id] || []).length;
                    const isAtLimit = !isSelected && selectedSubcategories.length >= maxSubcategories;

                    return (
                        <div key={sub.id} className="flex flex-col">
                            {/* Subcategory button */}
                            <button
                                type="button"
                                onClick={() => toggleSubcategory(sub.id)}
                                disabled={isAtLimit}
                                className={`
                                    flex items-center gap-2 p-2.5 min-h-[44px] rounded-lg border text-left transition-all text-xs font-semibold w-full
                                    ${isSelected
                                        ? 'bg-[rgba(20,184,166,0.10)] border-[#14B8A6] text-[#0F766E]'
                                        : isAtLimit
                                            ? 'bg-[#F4F6F8] border-[#E6E8EC] text-slate-300 cursor-not-allowed'
                                            : 'bg-[#F4F6F8] border-[#E6E8EC] text-slate-500 hover:border-slate-300 hover:text-slate-700'
                                    }
                                `}
                            >
                                <span className={`w-4 h-4 rounded shrink-0 border flex items-center justify-center transition-all ${isSelected ? 'bg-[#14B8A6] border-[#14B8A6]' : 'border-slate-300'}`}>
                                    {isSelected && <Check size={10} className="text-white" />}
                                </span>
                                <span className="flex-1 leading-tight break-words">{getLabel(sub.label)}</span>
                                {isSelected && (
                                    <span className="flex items-center gap-1 ml-auto shrink-0">
                                        {selectedCount > 0 && (
                                            <span className="text-[9px] bg-[#14B8A6] text-white px-1.5 py-0.5 rounded-full font-bold">
                                                {selectedCount}
                                            </span>
                                        )}
                                        <button
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); toggleExpand(sub.id); }}
                                            className="p-0.5 text-[#14B8A6] hover:text-[#0F766E]"
                                        >
                                            {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                        </button>
                                    </span>
                                )}
                            </button>

                            {/* Specific services for this subcategory (expanded panel) */}
                            {isSelected && isExpanded && (
                                <div className="mt-1 p-2.5 bg-[#F8FAFC] rounded-lg border border-[#14B8A6]/20 animate-in fade-in slide-in-from-top-1 duration-150">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">
                                        Servicios específicos
                                    </p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {sub.specialties.map((spec: any) => {
                                            const specEs = typeof spec === 'string' ? spec : spec.es;
                                            const specLabel = typeof spec === 'string' ? spec : (spec[lang] ?? spec.es);
                                            const isSpecSelected = (specialtiesBySubcategory[sub.id] || []).includes(specEs);

                                            return (
                                                <button
                                                    key={specEs}
                                                    type="button"
                                                    onClick={() => toggleSpecificService(sub.id, specEs)}
                                                    className={`
                                                        text-[10px] px-2 py-1 rounded-full border transition-all flex items-center gap-1
                                                        ${isSpecSelected
                                                            ? 'bg-[rgba(20,184,166,0.10)] border-[#14B8A6] text-[#0F766E] font-semibold'
                                                            : 'bg-white border-[#E6E8EC] text-slate-500 hover:border-slate-300 hover:text-slate-700'
                                                        }
                                                    `}
                                                >
                                                    {isSpecSelected && <Check size={8} />}
                                                    {specLabel}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Limit indicator */}
            {selectedSubcategories.length > 0 && (
                <p className="text-[11px] text-slate-400 text-right">
                    {selectedSubcategories.length}/{maxSubcategories} especialidades
                </p>
            )}
        </div>
    );
}
