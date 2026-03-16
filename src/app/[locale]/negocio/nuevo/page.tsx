'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';

export default function DeprecatedRouteRedirect() {
    const router = useRouter();
    const locale = useLocale();

    useEffect(() => {
        router.replace(`/${locale}/business/setup`);
    }, [router, locale]);

    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50">
            <div className="animate-pulse flex flex-col items-center">
                <div className="w-8 h-8 rounded-full border-4 border-teal-500 border-t-transparent animate-spin mb-4"></div>
                <p className="text-slate-500 font-medium">Redirigiendo...</p>
            </div>
        </div>
    );
}
