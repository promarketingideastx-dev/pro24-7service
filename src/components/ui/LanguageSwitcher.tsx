'use client';

import { Globe, ChevronDown } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useLocale } from 'next-intl';
import { useState, useRef, useEffect } from 'react';

const LANGS = [
    { code: 'es', label: 'Español', flag: '🇪🇸' },
    { code: 'en', label: 'English', flag: '🇺🇸' },
    { code: 'pt-BR', label: 'Português BR', flag: '🇧🇷' },
];

const SUPPORTED = ['es', 'en', 'pt-BR'];

interface LanguageSwitcherProps {
    /** Visual variant: 'full' shows flag + code + chevron, 'icon' shows only globe icon */
    variant?: 'full' | 'icon';
    /** Extra CSS classes for the trigger button */
    className?: string;
}

export default function LanguageSwitcher({ variant = 'full', className = '' }: LanguageSwitcherProps) {
    const locale = useLocale();
    const pathname = usePathname();
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    // Close on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const current = LANGS.find(l => l.code === locale) ?? LANGS[0];

    const switchLocale = (newLocale: string) => {
        const segments = pathname.split('/').filter(Boolean);
        if (SUPPORTED.includes(segments[0])) {
            segments[0] = newLocale;
        } else {
            segments.unshift(newLocale);
        }
        window.location.href = '/' + segments.join('/');
        setOpen(false);
    };

    return (
        <div ref={ref} className="relative">
            <button
                onClick={() => setOpen(p => !p)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/[0.08] hover:border-white/20 text-sm text-white transition-colors ${className}`}
            >
                <Globe size={13} className="text-brand-neon-cyan shrink-0" />
                {variant === 'full' && (
                    <>
                        <span className="text-[10px] font-bold text-brand-neon-cyan">{current.code.toUpperCase()}</span>
                        <ChevronDown size={11} className="text-slate-400" />
                    </>
                )}
            </button>

            {open && (
                <div className="absolute right-0 top-full mt-1 bg-[#0f1a2e] border border-white/10 rounded-xl shadow-2xl w-44 z-[3000] overflow-hidden">
                    {LANGS.map(l => (
                        <button
                            key={l.code}
                            onClick={() => switchLocale(l.code)}
                            className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 hover:bg-white/5 transition-colors ${locale === l.code ? 'text-brand-neon-cyan' : 'text-slate-300'}`}
                        >
                            <span>{l.flag}</span>
                            <span className="flex-1">{l.label}</span>
                            {locale === l.code && <span className="text-brand-neon-cyan text-xs">✓</span>}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
