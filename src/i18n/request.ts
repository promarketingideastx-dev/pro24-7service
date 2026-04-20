import { getRequestConfig } from 'next-intl/server';

const LOCALES = ['es', 'en', 'pt-BR'] as const;
type Locale = typeof LOCALES[number];

const messageLoaders = {
    'es': () => import('../../messages/es.json').then((module) => module.default),
    'en': () => import('../../messages/en.json').then((module) => module.default),
    'pt-BR': () => import('../../messages/pt-BR.json').then((module) => module.default),
};

export default getRequestConfig(async ({ requestLocale }) => {
    // next-intl v4: requestLocale is a Promise
    let locale = (await requestLocale) as string;

    // Validate — fall back to default if not recognized
    if (!locale || !LOCALES.includes(locale as Locale)) {
        locale = 'es';
    }

    // Explicit dictionary loader to prevent Next.js webpack cache collapse
    const messages = await messageLoaders[locale as Locale]();

    return {
        locale,
        messages,
    };
});
