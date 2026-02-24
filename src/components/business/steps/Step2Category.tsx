'use client';

import { TAXONOMY } from '@/lib/taxonomy';
import { useLocale, useTranslations } from 'next-intl';
import { motion } from 'framer-motion';

export function Step2Category({ data, update }: any) {
    const t = useTranslations('wizard.step2');
    const locale = useLocale();
    const lang = locale === 'pt-BR' ? 'pt' : locale === 'en' ? 'en' : 'es';

    const categories = Object.values(TAXONOMY);
    const selectedCategory = categories.find(c => c.id === data.category);
    const selectedSubcategory = selectedCategory?.subcategories.find(s => s.id === data.subcategory);

    const toggleSpecialty = (specialty: string) => {
        const current = data.specialties || [];
        if (current.includes(specialty)) {
            update('specialties', current.filter((s: string) => s !== specialty));
        } else {
            update('specialties', [...current, specialty]);
        }
    };

    const getLabel = (labelObj: any, fallback?: string) => {
        if (!labelObj) return fallback ?? '';
        return labelObj[lang] ?? labelObj.es ?? fallback ?? '';
    };

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-3xl font-bold mb-2">{t('title')}</h2>
                <p className="text-slate-400">{t('subtitle')}</p>
            </div>

            {/* 1. Main Category Selection */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {categories.map((cat) => (
                    <div
                        key={cat.id}
                        onClick={() => {
                            update('category', cat.id);
                            update('subcategory', '');
                            update('specialties', []);
                        }}
                        className={`cursor-pointer p-4 rounded-xl border transition-all ${data.category === cat.id
                            ? 'bg-blue-600/20 border-blue-500 text-white'
                            : 'bg-slate-800 border-slate-200 hover:bg-slate-700/50 text-slate-300'
                            }`}
                    >
                        <div className="text-2xl mb-2">
                            {cat.id === 'art_design' && '🎨'}
                            {cat.id === 'general_services' && '🛠️'}
                            {cat.id === 'beauty_wellness' && '✨'}
                        </div>
                        <div className="font-bold">{getLabel(cat.label)}</div>
                    </div>
                ))}
            </div>

            {/* 2. Subcategory Selection */}
            {selectedCategory && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                >
                    <h3 className="text-xl font-semibold text-white">{t('chooseService')}</h3>
                    <div className="grid grid-cols-2 gap-3">
                        {selectedCategory.subcategories.map((sub) => (
                            <div
                                key={sub.id}
                                onClick={() => {
                                    update('subcategory', sub.id);
                                    update('specialties', []);
                                }}
                                className={`cursor-pointer px-4 py-3 rounded-lg border text-sm font-medium transition-all ${data.subcategory === sub.id
                                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                                    : 'bg-slate-800 border-slate-200 hover:border-slate-300 text-slate-300'
                                    }`}
                            >
                                {getLabel(sub.label)}
                            </div>
                        ))}
                    </div>
                </motion.div>
            )}

            {/* 3. Specialties Selection */}
            {selectedSubcategory && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                >
                    <h3 className="text-xl font-semibold text-white">{t('chooseSpecialties')}</h3>
                    <div className="flex flex-wrap gap-2">
                        {selectedSubcategory.specialties.map((spec) => {
                            const specKey = typeof spec === 'string' ? spec : (spec as any).es;
                            const specLabel = typeof spec === 'string' ? spec : getLabel(spec, specKey);
                            return (
                                <span
                                    key={specKey}
                                    onClick={() => toggleSpecialty(specKey)}
                                    className={`cursor-pointer px-3 py-1.5 rounded-full text-sm border transition-all ${data.specialties.includes(specKey)
                                        ? 'bg-green-500/20 border-green-500 text-green-400'
                                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
                                        }`}
                                >
                                    {specLabel}
                                </span>
                            );
                        })}
                    </div>
                </motion.div>
            )}
        </div>
    );
}
