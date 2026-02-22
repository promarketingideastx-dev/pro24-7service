'use client';

import { ImagePlus, X } from 'lucide-react';
import { useState } from 'react';
import { useTranslations } from 'next-intl';

export function Step4Portfolio({ data, update }: any) {
    const t = useTranslations('wizard.step4portfolio');
    const [previews, setPreviews] = useState<string[]>([]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const url = URL.createObjectURL(file);
            setPreviews(prev => [...prev, url]);
        }
    };

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-3xl font-bold mb-2">{t('title')}</h2>
                <p className="text-slate-400">{t('subtitle')}</p>
            </div>

            <div className="border-2 border-dashed border-slate-700 rounded-2xl p-10 text-center hover:border-blue-500 hover:bg-slate-800/50 transition-all cursor-pointer relative group">
                <input
                    type="file"
                    accept="image/*"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={handleFileChange}
                />
                <div className="flex flex-col items-center">
                    <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4 text-slate-400 group-hover:text-blue-400 group-hover:bg-blue-500/10 transition-colors">
                        <ImagePlus className="w-8 h-8" />
                    </div>
                    <h3 className="font-semibold text-white">{t('uploadBtn')}</h3>
                    <p className="text-sm text-slate-500 mt-2">{t('uploadHint')}</p>
                </div>
            </div>

            {previews.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-in fade-in duration-500">
                    {previews.map((src, idx) => (
                        <div key={idx} className="relative aspect-square rounded-xl overflow-hidden group">
                            <img src={src} alt="Preview" className="w-full h-full object-cover" />
                            <button
                                className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                                onClick={() => setPreviews(prev => prev.filter((_, i) => i !== idx))}
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <div className="bg-gradient-to-r from-indigo-900/50 to-purple-900/50 p-4 rounded-xl border border-indigo-500/20 flex items-start gap-3">
                <span className="text-xl">💡</span>
                <div>
                    <h4 className="font-bold text-indigo-300">{t('tipTitle')}</h4>
                    <p className="text-sm text-indigo-200/80">{t('tipDesc')}</p>
                </div>
            </div>
        </div>
    );
}
