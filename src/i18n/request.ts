import { getRequestConfig } from 'next-intl/server';

const LOCALES = ['es', 'en', 'pt-BR'] as const;
type Locale = typeof LOCALES[number];

export default getRequestConfig(async ({ requestLocale }) => {
    // next-intl v4: requestLocale is a Promise
    let locale = (await requestLocale) as string;

    // Validate — fall back to default if not recognized
    if (!locale || !LOCALES.includes(locale as Locale)) {
        locale = 'es';
    }

    // STRICT LOADER: NO MERGE, NO FALLBACK GLOBAL, NO MEZCLA
    const messages = (await import(`../../messages/${locale}.json`)).default;

    return {
        locale,
        messages,
    };
});
