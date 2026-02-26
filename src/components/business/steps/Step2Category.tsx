'use client';

import { TAXONOMY } from '@/lib/taxonomy';
import { useLocale, useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import SpecialtyPicker from '@/components/business/SpecialtyPicker';

export function Step2Category({ data, update }: any) {
    const t = useTranslations('wizard.step2');
    const locale = useLocale();
    const lang = locale === 'pt-BR' ? 'pt' : locale === 'en' ? 'en' : 'es';

    const categories = Object.values(TAXONOMY);

    const getLabel = (labelObj: any, fallback?: string) => {
        if (!labelObj) return fallback ?? '';
        return labelObj[lang] ?? labelObj.es ?? fallback ?? '';
    };

    // Current state (new model)
    const selectedCategoryId: string = data.category || '';
    const selectedSubcategories: string[] = data.subcategories || (data.subcategory ? [data.subcategory] : []);
    const specialtiesBySubcategory: Record<string, string[]> = data.specialtiesBySubcategory || {};

    const handleCategorySelect = (catId: string) => {
        update('category', catId);
        update('subcategory', '');
        update('subcategories', []);
        update('specialties', []);
        update('specialtiesBySubcategory', {});
    };

    const handleSpecialtyChange = (newSubcategories: string[], newSpecialtiesBySubcategory: Record<string, string[]>) => {
        update('subcategories', newSubcategories);
        update('subcategory', newSubcategories[0] || '');
        update('specialtiesBySubcategory', newSpecialtiesBySubcategory);
        // Keep legacy flat specialties in sync
        const flat = Object.values(newSpecialtiesBySubcategory).flat();
        update('specialties', flat);
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
                        onClick={() => handleCategorySelect(cat.id)}
                        className={`cursor-pointer p-4 rounded-xl border transition-all ${selectedCategoryId === cat.id
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

            {/* 2. Specialty Picker (subcategories + specific services) */}
            {selectedCategoryId && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                >
                    <div>
                        <h3 className="text-xl font-semibold text-white mb-1">{t('chooseService')}</h3>
                        <p className="text-slate-400 text-sm mb-3">
                            Selecciona hasta 3 especialidades y los servicios que ofreces dentro de cada una
                        </p>
                    </div>

                    <SpecialtyPicker
                        categoryId={selectedCategoryId}
                        selectedSubcategories={selectedSubcategories}
                        specialtiesBySubcategory={specialtiesBySubcategory}
                        onChange={handleSpecialtyChange}
                        maxSubcategories={3}
                    />
                </motion.div>
            )}
        </div>
    );
}
