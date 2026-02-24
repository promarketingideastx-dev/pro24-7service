'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { Settings, Globe, Shield, Info, Save, RefreshCw, ToggleLeft, ToggleRight } from 'lucide-react';
import { toast } from 'sonner';

const ALL_COUNTRIES = [
    { code: 'HN', flag: '🇭🇳', name: 'Honduras' },
    { code: 'GT', flag: '🇬🇹', name: 'Guatemala' },
    { code: 'SV', flag: '🇸🇻', name: 'El Salvador' },
    { code: 'NI', flag: '🇳🇮', name: 'Nicaragua' },
    { code: 'CR', flag: '🇨🇷', name: 'Costa Rica' },
    { code: 'PA', flag: '🇵🇦', name: 'Panamá' },
    { code: 'MX', flag: '🇲🇽', name: 'México' },
    { code: 'US', flag: '🇺🇸', name: 'Estados Unidos' },
    { code: 'CA', flag: '🇨🇦', name: 'Canadá' },
    { code: 'CO', flag: '🇨🇴', name: 'Colombia' },
    { code: 'BR', flag: '🇧🇷', name: 'Brasil' },
    { code: 'AR', flag: '🇦🇷', name: 'Argentina' },
    { code: 'CL', flag: '🇨🇱', name: 'Chile' },
    { code: 'PE', flag: '🇵🇪', name: 'Perú' },
    { code: 'ES', flag: '🇪🇸', name: 'España' },
];

interface CRMSettings {
    activeCountries: string[];
    betaOverride: boolean;
    maxImagesPerBusiness: number;
    updatedAt?: any;
}

const DEFAULT_SETTINGS: CRMSettings = {
    activeCountries: ['HN', 'GT', 'SV', 'NI', 'CR', 'PA', 'MX'],
    betaOverride: true,
    maxImagesPerBusiness: 10,
};

export default function SettingsPage() {
    const t = useTranslations('admin.settings');
    const [settings, setSettings] = useState<CRMSettings>(DEFAULT_SETTINGS);
    const [saving, setSaving] = useState(false);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        const unsub = onSnapshot(doc(db, 'crm_settings', 'global'), snap => {
            if (snap.exists()) {
                setSettings({ ...DEFAULT_SETTINGS, ...snap.data() as CRMSettings });
            }
            setLoaded(true);
        });
        return () => unsub();
    }, []);

    const toggleCountry = (code: string) => {
        setSettings(prev => ({
            ...prev,
            activeCountries: prev.activeCountries.includes(code)
                ? prev.activeCountries.filter(c => c !== code)
                : [...prev.activeCountries, code],
        }));
    };

    const save = async () => {
        setSaving(true);
        try {
            await setDoc(doc(db, 'crm_settings', 'global'), {
                ...settings,
                updatedAt: serverTimestamp(),
            });
            toast.success(t('saved'));
        } catch {
            toast.error(t('saveError'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-4 max-w-3xl">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-white flex items-center gap-2">
                        <Settings size={20} className="text-brand-neon-cyan" />
                        {t('title')}
                    </h1>
                    <p className="text-xs text-slate-500 mt-0.5">{t('subtitle')}</p>
                </div>
                <button onClick={save} disabled={saving || !loaded}
                    className="flex items-center gap-2 px-4 py-2 bg-brand-neon-cyan/10 border border-brand-neon-cyan/20 text-brand-neon-cyan text-sm font-medium rounded-xl hover:bg-brand-neon-cyan/20 transition-colors disabled:opacity-50">
                    {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                    {t('save')}
                </button>
            </div>

            {/* Active Countries */}
            <div className="bg-white/2 border border-slate-200 rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-2 mb-1">
                    <Globe size={16} className="text-brand-neon-cyan" />
                    <h2 className="text-sm font-semibold text-white">{t('activeCountries')}</h2>
                    <span className="ml-auto text-xs text-slate-500">{settings.activeCountries.length} / {ALL_COUNTRIES.length}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {ALL_COUNTRIES.map(c => {
                        const active = settings.activeCountries.includes(c.code);
                        return (
                            <button key={c.code} onClick={() => toggleCountry(c.code)}
                                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-sm transition-all ${active
                                    ? 'bg-brand-neon-cyan/10 border-brand-neon-cyan/30 text-white'
                                    : 'bg-white/3 border-slate-200 text-slate-500 hover:text-slate-800 hover:border-slate-300'
                                    }`}>
                                <span className="text-base">{c.flag}</span>
                                <span className="flex-1 text-left text-xs font-medium">{c.name}</span>
                                {active
                                    ? <ToggleRight size={16} className="text-brand-neon-cyan shrink-0" />
                                    : <ToggleLeft size={16} className="shrink-0" />
                                }
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Beta & Rules */}
            <div className="bg-white/2 border border-slate-200 rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-2 mb-1">
                    <Shield size={16} className="text-brand-neon-cyan" />
                    <h2 className="text-sm font-semibold text-white">{t('businessRules')}</h2>
                </div>

                {/* Beta override */}
                <div className="flex items-center justify-between py-3 border-b border-slate-200">
                    <div>
                        <p className="text-sm text-white font-medium">{t('betaOverride')}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{t('betaOverrideDesc')}</p>
                    </div>
                    <button onClick={() => setSettings(p => ({ ...p, betaOverride: !p.betaOverride }))}
                        className="shrink-0">
                        {settings.betaOverride
                            ? <ToggleRight size={28} className="text-brand-neon-cyan" />
                            : <ToggleLeft size={28} className="text-slate-500" />
                        }
                    </button>
                </div>

                {/* Max images */}
                <div className="flex items-center justify-between py-2">
                    <div>
                        <p className="text-sm text-white font-medium">{t('maxImages')}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{t('maxImagesDesc')}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setSettings(p => ({ ...p, maxImagesPerBusiness: Math.max(1, p.maxImagesPerBusiness - 1) }))}
                            className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-200 text-white text-sm hover:bg-slate-100 transition-colors flex items-center justify-center">−</button>
                        <span className="text-white font-bold w-6 text-center">{settings.maxImagesPerBusiness}</span>
                        <button onClick={() => setSettings(p => ({ ...p, maxImagesPerBusiness: Math.min(50, p.maxImagesPerBusiness + 1) }))}
                            className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-200 text-white text-sm hover:bg-slate-100 transition-colors flex items-center justify-center">+</button>
                    </div>
                </div>
            </div>

            {/* System Info */}
            <div className="bg-white/2 border border-slate-200 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3">
                    <Info size={16} className="text-brand-neon-cyan" />
                    <h2 className="text-sm font-semibold text-white">{t('systemInfo')}</h2>
                </div>
                <div className="space-y-2 text-xs font-mono">
                    {[
                        { label: 'App', value: 'PRO24/7 Admin CRM v1.0' },
                        { label: 'Firebase Project', value: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? '—' },
                        { label: 'Environment', value: process.env.NODE_ENV ?? 'development' },
                        { label: 'Next.js', value: '14 (App Router)' },
                    ].map(row => (
                        <div key={row.label} className="flex gap-3">
                            <span className="text-slate-600 w-36 shrink-0">{row.label}</span>
                            <span className="text-slate-300">{row.value}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
