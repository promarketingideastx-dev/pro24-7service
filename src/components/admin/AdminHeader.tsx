'use client';

import { useState } from 'react';
import { Menu, Globe, ChevronDown, LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';

const COUNTRIES = [
    { code: 'ALL', flag: '🌍', label: 'Todos los países' },
    { code: 'HN', flag: '🇭🇳', label: 'Honduras' },
    { code: 'US', flag: '🇺🇸', label: 'Estados Unidos' },
    { code: 'MX', flag: '🇲🇽', label: 'México' },
    { code: 'BR', flag: '🇧🇷', label: 'Brasil' },
    { code: 'GT', flag: '🇬🇹', label: 'Guatemala' },
    { code: 'SV', flag: '🇸🇻', label: 'El Salvador' },
];

const LANGS = [
    { code: 'es', label: 'Español' },
    { code: 'en', label: 'English' },
    { code: 'pt-BR', label: 'Português BR' },
];

interface AdminHeaderProps {
    onMenuToggle: () => void;
}

export default function AdminHeader({ onMenuToggle }: AdminHeaderProps) {
    const { user } = useAuth();
    const router = useRouter();
    const [countryOpen, setCountryOpen] = useState(false);
    const [langOpen, setLangOpen] = useState(false);
    const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);
    const [selectedLang, setSelectedLang] = useState(LANGS[0]);

    const handleLogout = async () => {
        await signOut(auth);
        router.replace('/auth/login');
    };

    return (
        <header className="h-14 bg-[#0a1128] border-b border-white/5 flex items-center px-4 gap-3 sticky top-0 z-30">
            <button onClick={onMenuToggle} className="text-slate-400 hover:text-white transition-colors lg:hidden">
                <Menu size={18} />
            </button>

            <div className="flex-1" />

            {/* Country Selector */}
            <div className="relative">
                <button
                    onClick={() => { setCountryOpen(p => !p); setLangOpen(false); }}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/8 hover:border-white/15 text-sm text-white transition-colors"
                >
                    <Globe size={14} className="text-brand-neon-cyan" />
                    <span>{selectedCountry.flag} {selectedCountry.code}</span>
                    <ChevronDown size={12} className="text-slate-400" />
                </button>
                {countryOpen && (
                    <div className="absolute right-0 top-full mt-1 bg-[#0f1a2e] border border-white/10 rounded-xl shadow-2xl w-52 z-50 overflow-hidden">
                        {COUNTRIES.map(c => (
                            <button
                                key={c.code}
                                onClick={() => { setSelectedCountry(c); setCountryOpen(false); }}
                                className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 hover:bg-white/5 transition-colors ${selectedCountry.code === c.code ? 'text-brand-neon-cyan' : 'text-slate-300'}`}
                            >
                                <span>{c.flag}</span>
                                <span>{c.label}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Language Selector */}
            <div className="relative">
                <button
                    onClick={() => { setLangOpen(p => !p); setCountryOpen(false); }}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/8 hover:border-white/15 text-sm text-white transition-colors"
                >
                    <span className="text-brand-neon-cyan font-bold text-xs">{selectedLang.code.toUpperCase()}</span>
                    <ChevronDown size={12} className="text-slate-400" />
                </button>
                {langOpen && (
                    <div className="absolute right-0 top-full mt-1 bg-[#0f1a2e] border border-white/10 rounded-xl shadow-2xl w-40 z-50 overflow-hidden">
                        {LANGS.map(l => (
                            <button
                                key={l.code}
                                onClick={() => { setSelectedLang(l); setLangOpen(false); }}
                                className={`w-full text-left px-4 py-2.5 text-sm hover:bg-white/5 transition-colors ${selectedLang.code === l.code ? 'text-brand-neon-cyan' : 'text-slate-300'}`}
                            >
                                {l.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Admin user + logout */}
            <div className="flex items-center gap-2 pl-3 border-l border-white/5">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-neon-cyan to-brand-neon-purple flex items-center justify-center text-black text-xs font-bold">
                    {user?.email?.charAt(0).toUpperCase() ?? 'A'}
                </div>
                <button
                    onClick={handleLogout}
                    title="Cerrar sesión"
                    className="text-slate-500 hover:text-red-400 transition-colors"
                >
                    <LogOut size={15} />
                </button>
            </div>
        </header>
    );
}
