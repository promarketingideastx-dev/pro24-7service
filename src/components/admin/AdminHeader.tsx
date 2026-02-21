'use client';

import { useState } from 'react';
import { Menu, Globe, ChevronDown, LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { useAdminContext } from '@/context/AdminContext';

const COUNTRIES = [
    { code: 'ALL', flag: '🌍', label: 'Todos los países' },
    { code: 'HN', flag: '🇭🇳', label: 'Honduras' },
    { code: 'GT', flag: '🇬🇹', label: 'Guatemala' },
    { code: 'SV', flag: '🇸🇻', label: 'El Salvador' },
    { code: 'NI', flag: '🇳🇮', label: 'Nicaragua' },
    { code: 'CR', flag: '🇨🇷', label: 'Costa Rica' },
    { code: 'PA', flag: '🇵🇦', label: 'Panamá' },
    { code: 'MX', flag: '🇲🇽', label: 'México' },
    { code: 'US', flag: '🇺🇸', label: 'Estados Unidos' },
    { code: 'CA', flag: '🇨🇦', label: 'Canadá' },
    { code: 'CO', flag: '🇨🇴', label: 'Colombia' },
    { code: 'BR', flag: '🇧🇷', label: 'Brasil' },
    { code: 'AR', flag: '🇦🇷', label: 'Argentina' },
    { code: 'CL', flag: '🇨🇱', label: 'Chile' },
    { code: 'PE', flag: '🇵🇪', label: 'Perú' },
    { code: 'EC', flag: '🇪🇨', label: 'Ecuador' },
    { code: 'VE', flag: '🇻🇪', label: 'Venezuela' },
    { code: 'BO', flag: '🇧🇴', label: 'Bolivia' },
    { code: 'PY', flag: '🇵🇾', label: 'Paraguay' },
    { code: 'UY', flag: '🇺🇾', label: 'Uruguay' },
    { code: 'DO', flag: '🇩🇴', label: 'Rep. Dominicana' },
    { code: 'CU', flag: '🇨🇺', label: 'Cuba' },
    { code: 'ES', flag: '🇪🇸', label: 'España' },
];

const LANGS = [
    { code: 'es', label: 'Español', ready: true },
    { code: 'en', label: 'English', ready: false },
    { code: 'pt-BR', label: 'Português BR', ready: false },
];

interface AdminHeaderProps {
    onMenuToggle: () => void;
}

export default function AdminHeader({ onMenuToggle }: AdminHeaderProps) {
    const { user } = useAuth();
    const router = useRouter();
    const { selectedCountry, setSelectedCountry, selectedLang, setSelectedLang } = useAdminContext();
    const [countryOpen, setCountryOpen] = useState(false);
    const [langOpen, setLangOpen] = useState(false);

    const currentCountry = COUNTRIES.find(c => c.code === selectedCountry) ?? COUNTRIES[0];
    const currentLang = LANGS.find(l => l.code === selectedLang) ?? LANGS[0];

    const handleLogout = async () => {
        await signOut(auth);
        router.replace('/auth/login');
    };

    return (
        <header className="h-14 bg-[#0a1128] border-b border-white/5 flex items-center px-4 gap-3 sticky top-0 z-[2000]">
            <button onClick={onMenuToggle} className="text-slate-400 hover:text-white transition-colors lg:hidden">
                <Menu size={18} />
            </button>

            <div className="flex-1" />

            {/* Country Selector */}
            <div className="relative">
                <button
                    onClick={() => { setCountryOpen(p => !p); setLangOpen(false); }}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/[0.08] hover:border-white/20 text-sm text-white transition-colors"
                >
                    <Globe size={14} className="text-brand-neon-cyan" />
                    <span>{currentCountry.flag} {currentCountry.code}</span>
                    <ChevronDown size={12} className="text-slate-400" />
                </button>
                {countryOpen && (
                    <div className="absolute right-0 top-full mt-1 bg-[#0f1a2e] border border-white/10 rounded-xl shadow-2xl w-52 z-[2100] overflow-y-auto max-h-80">
                        {COUNTRIES.map(c => (
                            <button
                                key={c.code}
                                onClick={() => { setSelectedCountry(c.code); setCountryOpen(false); }}
                                className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 hover:bg-white/5 transition-colors ${currentCountry.code === c.code ? 'text-brand-neon-cyan' : 'text-slate-300'}`}
                            >
                                <span>{c.flag}</span>
                                <span className="flex-1">{c.label}</span>
                                {currentCountry.code === c.code && <span className="text-brand-neon-cyan">✓</span>}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Language Selector */}
            <div className="relative">
                <button
                    onClick={() => { setLangOpen(p => !p); setCountryOpen(false); }}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/[0.08] hover:border-white/20 text-sm text-white transition-colors"
                >
                    <span className="text-brand-neon-cyan font-bold text-xs">{currentLang.code.toUpperCase()}</span>
                    <ChevronDown size={12} className="text-slate-400" />
                </button>
                {langOpen && (
                    <div className="absolute right-0 top-full mt-1 bg-[#0f1a2e] border border-white/10 rounded-xl shadow-2xl w-48 z-[2100] overflow-hidden">
                        {LANGS.map(l => (
                            <button
                                key={l.code}
                                onClick={() => { if (l.ready) { setSelectedLang(l.code); setLangOpen(false); } }}
                                className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 transition-colors
                                    ${!l.ready ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/5'}
                                    ${currentLang.code === l.code ? 'text-brand-neon-cyan' : 'text-slate-300'}`}
                            >
                                <span className="flex-1">{l.label}</span>
                                {!l.ready && <span className="text-[9px] bg-slate-700 text-slate-400 px-1.5 py-0.5 rounded-full">🔜 Fase C</span>}
                                {l.ready && currentLang.code === l.code && <span className="text-brand-neon-cyan text-xs">✓</span>}
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
                <button onClick={handleLogout} title="Cerrar sesión" className="text-slate-500 hover:text-red-400 transition-colors">
                    <LogOut size={15} />
                </button>
            </div>
        </header>
    );
}
