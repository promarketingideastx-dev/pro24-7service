'use client';
import { useTranslations } from 'next-intl';

export function Step1Identity({ data, update }: any) {
    const t = useTranslations('wizard.step1');

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold mb-2">{t('title')}</h2>
                <p className="text-slate-400">{t('subtitle')}</p>
            </div>

            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">{t('nameLabel')}</label>
                    <input
                        type="text"
                        value={data.businessName}
                        onChange={(e) => update('businessName', e.target.value)}
                        placeholder={t('namePlaceholder')}
                        className="w-full bg-slate-800 border border-slate-200 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-600"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">{t('descLabel')}</label>
                    <textarea
                        rows={4}
                        value={data.description}
                        onChange={(e) => update('description', e.target.value)}
                        placeholder={t('descPlaceholder')}
                        className="w-full bg-slate-800 border border-slate-200 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-600 resize-none"
                    />
                    <p className="text-xs text-slate-500 mt-2 text-right">{data.description.length}/300 {t('chars')}</p>
                </div>
            </div>
        </div>
    );
}
