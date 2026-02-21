import type { Metadata } from 'next';
import { Inter, Outfit } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { Toaster } from 'sonner';
import CookieConsent from '@/components/ui/CookieConsent';

const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit' });
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'PRO24/7 | Servicios Premium',
  description: 'Conecta con los mejores profesionales.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={`${outfit.variable} ${inter.variable}`}>
      <body className="font-sans antialiased text-white bg-slate-900 selection:bg-sky-500/30 pb-20">
        <Providers>
          {children}
          <Toaster position="top-right" theme="dark" richColors />
          <CookieConsent />
        </Providers>
      </body>
    </html>
  );
}
