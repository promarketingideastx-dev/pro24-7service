'use client';

import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';

export function BackButton() {
    const router = useRouter();
    const locale = useLocale();

    const handleBack = () => {
        if (typeof window !== 'undefined' && window.history.length > 2) {
            router.back();
        } else {
            router.push(`/${locale}`);
        }
    };

    return (
        <button
            type="button"
            onClick={handleBack}
            className="p-3 text-slate-500 hover:text-slate-800 bg-white/50 backdrop-blur-md rounded-full shadow-sm hover:shadow-md border border-slate-200/50 transition-all flex items-center justify-center group active:scale-95"
            title="Volver atrás"
            aria-label="Volver atrás"
        >
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24" height="24" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                className="group-hover:-translate-x-1 transition-transform"
            >
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
        </button>
    );
}
