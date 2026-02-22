import type { Metadata } from 'next';
import { Inter, Outfit } from 'next/font/google';
import './globals.css';

const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit' });
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'PRO24/7YA | Servicios Premium',
  description: 'Conecta con los mejores profesionales.',
  icons: {
    icon: [
      { url: '/favicon.png', sizes: '64x64', type: 'image/png' },
    ],
    apple: '/icon-512.png',
    shortcut: '/favicon.png',
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
        {children}
      </body>
    </html>
  );
}
