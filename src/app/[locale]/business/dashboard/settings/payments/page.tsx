'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { BusinessProfileService } from '@/services/businessProfile.service';
import { PaymentSettings } from '@/types/firestore-schema';
import { Loader2, Save, BadgeDollarSign, Building2, CreditCard, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import GlassPanel from '@/components/ui/GlassPanel';
import { useTranslations } from 'next-intl';

export default function PaymentSettingsPage() {
    const { user } = useAuth();
    const t = useTranslations('business.payments');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Default Settings
    const [settings, setSettings] = useState<PaymentSettings>({
        acceptsCash: true,
        acceptsBankTransfer: false,
        bankTransferDetails: '',
        acceptsDigitalWallet: false,
        digitalWalletDetails: '',
        requiresDeposit: false,
        depositType: 'fixed',
        depositValue: 0,
        depositNotes: ''
    });

    useEffect(() => {
        if (user?.uid) {
            loadSettings();
        }
    }, [user]);

    const loadSettings = async () => {
        try {
            const profile = await BusinessProfileService.getProfile(user!.uid);
            if (profile?.paymentSettings) {
                setSettings({ ...settings, ...profile.paymentSettings });
            }
        } catch (error) {
            console.error(error);
            toast.error(t('loadError'));
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!user?.uid) return;
        setSaving(true);
        try {
            await BusinessProfileService.updatePaymentSettings(user.uid, settings);
            toast.success(t('saved'));
        } catch (error) {
            console.error(error);
            toast.error(t('saveError'));
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-brand-neon-cyan" />
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-4xl mx-auto pb-20">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-white">{t('title')}</h1>
                    <p className="text-slate-400 text-sm">{t('subtitle')}</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 bg-brand-neon-cyan text-black px-4 py-2 rounded-lg font-bold hover:bg-cyan-400 transition-colors disabled:opacity-50"
                >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {saving ? t('saving') : t('saveChanges')}
                </button>
            </div>

            {/* Methods Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* 1. Cash */}
                <GlassPanel className="p-6 space-y-4">
                    <div className="flex items-start justify-between">
                        <div className="flex gap-3">
                            <div className="p-2 bg-green-500/10 rounded-lg text-green-500">
                                <BadgeDollarSign className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="font-bold text-white">{t('cash')}</h3>
                                <p className="text-xs text-slate-400">{t('cashDesc')}</p>
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={settings.acceptsCash}
                                onChange={(e) => setSettings({ ...settings, acceptsCash: e.target.checked })}
                            />
                            <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-neon-cyan"></div>
                        </label>
                    </div>
                </GlassPanel>

                {/* 2. Bank Transfer */}
                <GlassPanel className="p-6 space-y-4">
                    <div className="flex items-start justify-between">
                        <div className="flex gap-3">
                            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
                                <Building2 className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="font-bold text-white">{t('bankTransfer')}</h3>
                                <p className="text-xs text-slate-400">{t('bankTransferDesc')}</p>
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={settings.acceptsBankTransfer}
                                onChange={(e) => setSettings({ ...settings, acceptsBankTransfer: e.target.checked })}
                            />
                            <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-neon-cyan"></div>
                        </label>
                    </div>

                    {settings.acceptsBankTransfer && (
                        <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                            <label className="text-xs text-slate-400 font-medium">{t('bankDetails')}</label>
                            <textarea
                                value={settings.bankTransferDetails || ''}
                                onChange={(e) => setSettings({ ...settings, bankTransferDetails: e.target.value })}
                                placeholder="Ej: Banco Atlántida, Cta: 1234567890, Nombre: Juan Pérez. Enviar comprobante a WhatsApp."
                                className="w-full bg-black/20 border border-slate-200 rounded-lg p-3 text-sm text-white focus:border-brand-neon-cyan focus:ring-1 focus:ring-brand-neon-cyan outline-none resize-none h-24"
                                maxLength={500}
                            />
                            <p className="text-[10px] text-slate-500 text-right">{settings.bankTransferDetails?.length || 0}/500</p>
                        </div>
                    )}
                </GlassPanel>

                {/* 3. Digital Wallet */}
                <GlassPanel className="p-6 space-y-4">
                    <div className="flex items-start justify-between">
                        <div className="flex gap-3">
                            <div className="p-2 bg-purple-500/10 rounded-lg text-purple-500">
                                <Wallet className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="font-bold text-white">{t('digitalWallet')}</h3>
                                <p className="text-xs text-slate-400">{t('digitalWalletDesc')}</p>
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={settings.acceptsDigitalWallet}
                                onChange={(e) => setSettings({ ...settings, acceptsDigitalWallet: e.target.checked })}
                            />
                            <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-neon-cyan"></div>
                        </label>
                    </div>

                    {settings.acceptsDigitalWallet && (
                        <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                            <label className="text-xs text-slate-400 font-medium">{t('walletDetails')}</label>
                            <textarea
                                value={settings.digitalWalletDetails || ''}
                                onChange={(e) => setSettings({ ...settings, digitalWalletDetails: e.target.value })}
                                placeholder="Ej: PayPal: usuario@email.com o Link de pago."
                                className="w-full bg-black/20 border border-slate-200 rounded-lg p-3 text-sm text-white focus:border-brand-neon-cyan focus:ring-1 focus:ring-brand-neon-cyan outline-none resize-none h-20"
                                maxLength={200}
                            />
                        </div>
                    )}
                </GlassPanel>

                {/* 4. Deposit Policy */}
                <GlassPanel className="p-6 space-y-4">
                    <div className="flex items-start justify-between">
                        <div className="flex gap-3">
                            <div className="p-2 bg-yellow-500/10 rounded-lg text-yellow-500">
                                <CreditCard className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="font-bold text-white">{t('deposit')}</h3>
                                <p className="text-xs text-slate-400">{t('depositDesc')}</p>
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={settings.requiresDeposit}
                                onChange={(e) => setSettings({ ...settings, requiresDeposit: e.target.checked })}
                            />
                            <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-neon-cyan"></div>
                        </label>
                    </div>

                    {settings.requiresDeposit && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 pt-2 border-t border-slate-200">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs text-slate-400 font-medium block mb-1">{t('depositType')}</label>
                                    <select
                                        value={settings.depositType}
                                        onChange={(e) => setSettings({ ...settings, depositType: e.target.value as 'fixed' | 'percent' })}
                                        className="w-full bg-black/20 border border-slate-200 rounded-lg p-2 text-sm text-white outline-none"
                                    >
                                        <option value="fixed">{t('depositFixed')}</option>
                                        <option value="percent">{t('depositPercent')}</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs text-slate-400 font-medium block mb-1">{t('depositValue')}</label>
                                    <input
                                        type="number"
                                        value={settings.depositValue}
                                        onChange={(e) => setSettings({ ...settings, depositValue: Number(e.target.value) })}
                                        className="w-full bg-black/20 border border-slate-200 rounded-lg p-2 text-sm text-white outline-none focus:border-brand-neon-cyan"
                                        min="0"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-slate-400 font-medium">{t('depositNotes')}</label>
                                <textarea
                                    value={settings.depositNotes || ''}
                                    onChange={(e) => setSettings({ ...settings, depositNotes: e.target.value })}
                                    placeholder="Ej: No reembolsable si cancela con menos de 24h."
                                    className="w-full bg-black/20 border border-slate-200 rounded-lg p-3 text-sm text-white focus:border-brand-neon-cyan focus:ring-1 focus:ring-brand-neon-cyan outline-none resize-none h-16"
                                    maxLength={200}
                                />
                            </div>
                        </div>
                    )}
                </GlassPanel>
            </div>

            <p className="text-center text-xs text-slate-500 mt-8">
                {t('legalNote')}
            </p>
        </div>
    );
}
