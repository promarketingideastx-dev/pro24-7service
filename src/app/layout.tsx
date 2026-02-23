import type { Metadata, Viewport } from 'next';
import { Inter, Outfit } from 'next/font/google';
import './globals.css';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit' });
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const viewport: Viewport = {
  themeColor: '#0B0F19',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: 'PRO24/7YA | Servicios Premium',
  description: 'Conecta con los mejores profesionales y negocios de tu ciudad. Agenda citas, revisa perfiles y encuentra servicios premium 24/7.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Pro24/7YA',
  },
  formatDetection: {
    telephone: true,
    email: true,
    address: true,
  },
  icons: {
    icon: [
      { url: '/favicon.png', sizes: '64x64', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    shortcut: '/favicon.png',
  },
  openGraph: {
    type: 'website',
    siteName: 'PRO24/7YA',
    title: 'PRO24/7YA | Servicios Premium',
    description: 'Conecta con los mejores profesionales y negocios de tu ciudad.',
    images: [{ url: 'https://pro247ya.com/icon-512.png', width: 512, height: 512, alt: 'PRO24/7YA Logo' }],
  },
};

export default function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params?: { locale?: string };
}) {
  const locale = params?.locale ?? 'es';
  return (
    <html lang={locale} className={`${outfit.variable} ${inter.variable}`}>
      <body className="font-sans antialiased text-white bg-slate-900 selection:bg-sky-500/30 pb-20">
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </body>
    </html>
  );
}
