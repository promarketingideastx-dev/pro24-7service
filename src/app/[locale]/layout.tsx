import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { Providers } from '../providers';
import { Toaster } from 'sonner';
import CookieConsent from '@/components/ui/CookieConsent';
import NotificationBanner from '@/components/ui/NotificationBanner';
import SWRegistrar from '@/components/ui/SWRegistrar';

const LOCALES = ['es', 'en', 'pt-BR'];

export default async function LocaleLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
}) {
    // next-intl v4 + Next.js 14: params is a Promise — must await
    const { locale } = await params;

    // Validate locale; fall back to 'es'
    const validLocale = LOCALES.includes(locale) ? locale : 'es';

    // Tell next-intl which locale to use for server-side rendering
    setRequestLocale(validLocale);

    // Load messages for the current locale
    const messages = await getMessages();

    return (
        <NextIntlClientProvider locale={validLocale} messages={messages}>
            <Providers>
                {children}
                <NotificationBanner />
                <SWRegistrar />
                <Toaster position="top-right" theme="dark" richColors />
                <CookieConsent />
            </Providers>
        </NextIntlClientProvider>
    );
}
