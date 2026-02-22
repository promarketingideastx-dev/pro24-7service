'use client';

import { TAXONOMY } from '@/lib/taxonomy';
import { motion } from 'framer-motion';

export function Step2Category({ data, update }: any) {
    const categories = Object.values(TAXONOMY);

    // Find selected category object
    const selectedCategory = categories.find(c => c.id === data.category);

    // Find selected subcategory object (if category is selected)
    const selectedSubcategory = selectedCategory?.subcategories.find(s => s.id === data.subcategory);

    const toggleSpecialty = (specialty: string) => {
        const current = data.specialties || [];
        if (current.includes(specialty)) {
            update('specialties', current.filter((s: string) => s !== specialty));
        } else {
            update('specialties', [...current, specialty]);
        }
    };

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-3xl font-bold mb-2">¿Cuál es tu especialidad?</h2>
                <p className="text-slate-400">Selecciona la categoría que mejor describe tu servicio.</p>
            </div>

            {/* 1. Main Category Selection */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {categories.map((cat) => (
                    <div
                        key={cat.id}
                        onClick={() => {
                            update('category', cat.id);
                            update('subcategory', ''); // Reset child fields
                            update('specialties', []);
                        }}
                        className={`cursor-pointer p-4 rounded-xl border transition-all ${data.category === cat.id
                            ? 'bg-blue-600/20 border-blue-500 text-white'
                            : 'bg-slate-800 border-white/5 hover:bg-slate-700/50 text-slate-300'
                            }`}
                    >
                        <div className="text-2xl mb-2">
                            {/* Icons mapping could be improved here or passed from taxonomy if we added them to the object */}
                            {cat.id === 'art_design' && '🎨'}
                            {cat.id === 'general_services' && '🛠️'}
                            {cat.id === 'beauty_wellness' && '✨'}
                        </div>
                        <div className="font-bold">{cat.label.es}</div>
                    </div>
                ))}
            </div>

            {/* 2. Subcategory Selection (Only if Main Category is selected) */}
            {selectedCategory && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                >
                    <h3 className="text-xl font-semibold text-white">Elige el servicio específico:</h3>
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
                                    : 'bg-slate-800 border-white/5 hover:border-white/20 text-slate-300'
                                    }`}
                            >
                                {sub.label.es}
                            </div>
                        ))}
                    </div>
                </motion.div>
            )}

            {/* 3. Specialties Selection (Only if Subcategory is selected) */}
            {selectedSubcategory && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                >
                    <h3 className="text-xl font-semibold text-white">¿Qué trabajos realizas? (Selecciona varios)</h3>
                    <div className="flex flex-wrap gap-2">
                        {selectedSubcategory.specialties.map((spec) => {
                            const specKey = typeof spec === 'string' ? spec : (spec as any).es;
                            const specLabel = typeof spec === 'string' ? spec : (spec as any).es;
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
