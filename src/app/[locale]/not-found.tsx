'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function LocaleNotFound() {
    const t = useTranslations('common.notFound');
    const params = useParams();

    // Fallback to 'es' if params.locale is somehow undefined
    const currentLocale = Array.isArray(params?.locale)
        ? params.locale[0]
        : params?.locale || 'es';

    return (
        <main className="min-h-[70vh] flex flex-col items-center justify-center p-8 text-center bg-[#F4F6F8]">
            <div className="space-y-4 max-w-sm">
                <h1 className="text-2xl font-bold text-slate-900">{t('title')}</h1>
                <p className="text-slate-500 text-sm">
                    {t('desc')}
                </p>
                <div className="pt-4">
                    <Link
                        href={`/${currentLocale}`}
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#14B8A6] hover:bg-[#0F9488] text-white text-sm font-bold transition-all shadow-lg"
                    >
                        {t('cta')}
                    </Link>
                </div>
            </div>
        </main>
    );
}
