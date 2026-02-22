'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { BusinessProfileService, BusinessProfileData } from '@/services/businessProfile.service';
import { StorageService } from '@/services/storage.service';
import GlassPanel from '@/components/ui/GlassPanel';

import { TAXONOMY } from '@/lib/taxonomy';
import {
    Save, Building, MapPin, Tag, Camera, ArrowLeft, Check,
    Palette, Wrench, Sparkles, MonitorPlay, Music, Scissors, Shield,
    Zap, Droplets, PaintBucket, Truck, Key, Car, Bike, Leaf, Clock,
    Upload, Trash2, Loader2, Image as ImageIcon, Instagram, Facebook, Share2
} from 'lucide-react';
import WeeklyScheduleEditor from '@/components/business/WeeklyScheduleEditor';
import { WeeklySchedule } from '@/services/employee.service';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import PortfolioManager from '@/components/business/profile/PortfolioManager';
import { useTranslations, useLocale } from 'next-intl';
import { useCountry } from '@/context/CountryContext';

export default function BusinessProfilePage() {
    const { user, userProfile } = useAuth();
    const router = useRouter();
    const t = useTranslations('business.profile');
    const locale = useLocale();
    const localeKey = locale === 'en' ? 'en' : locale === 'pt-BR' ? 'pt' : 'es';
    const { selectedCountry } = useCountry();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingImage, setUploadingImage] = useState<'cover' | 'logo' | null>(null);

    const [formData, setFormData] = useState<Partial<BusinessProfileData>>({});
    const [showMultiArea, setShowMultiArea] = useState(false);

    // Schedule API
    const [scheduleOpen, setScheduleOpen] = useState(false);

    const handleSaveSchedule = async (schedule: WeeklySchedule) => {
        setFormData(prev => ({ ...prev, openingHours: schedule }));
        setScheduleOpen(false);
        // Optional: auto-save profile here too? Or wait for big save button?
        // Let's wait for big save button to be consistent, but update local state so UI shows "Configurado"
        toast.success(t('scheduleUpdated'));
    };

    useEffect(() => {
        const loadProfile = async () => {
            if (!user) return;
            try {
                // If we have businessProfileId in userProfile, fetching is easier.
                // Otherwise we might need a method to get by ownerId.
                // Assuming BusinessProfileService has getByUserId or similar, or we query.
                // For now, let's assume we can get it.
                // Since BusinessProfileService doesn't have a direct "get" exposed in previous context,
                // we might need to rely on the fact that the ID is the UserID (as per our recent fix).

                const profileDoc = await BusinessProfileService.getProfile(user.uid);
                if (profileDoc) {
                    // If the profile has no country stored, fall back to the active CountryContext
                    setFormData({
                        ...profileDoc,
                        country: profileDoc.country || selectedCountry?.code || 'HN',
                    });
                }
            } catch (error) {
                console.error("Error loading profile", error);
            } finally {
                setLoading(false);
            }
        };

        if (user) loadProfile();
    }, [user]);

    const handleSave = async () => {
        if (!user) return;
        setSaving(true);
        try {
            // Exclude images from general profile save to avoid overwriting PortfolioManager changes
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { images, ...dataToSave } = formData;

            // Country is always locked to the CountryContext — never editable from profile
            const safeData = {
                ...dataToSave,
                country: selectedCountry?.code || formData.country || 'HN',
            };

            await BusinessProfileService.updateProfile(user.uid, safeData);
            toast.success(t('saved'));
        } catch (error) {
            console.error("Error updating", error);
            toast.error(t('saveError'));
        } finally {
            setSaving(false);
        }
    };

    const handleImageUpload = async (type: 'cover' | 'logo', e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;

        setUploadingImage(type);
        try {
            const url = await StorageService.uploadBusinessImage(user.uid, file);

            // Update local state
            if (type === 'cover') {
                setFormData(prev => ({ ...prev, coverImage: url }));
            } else {
                setFormData(prev => ({ ...prev, logoUrl: url }));
            }

            // Optional: Auto-save immediately for images? 
            // Often better UX for large files to save reference immediately, 
            // but sticking to "Save" button for consistency is safer.
            // HOWEVER, since we upload to storage, the file is already "live". 
            // It might be confusing if they leave without saving.
            // Let's just update state and let them hit Save.
            toast.success(t('imageUploaded'));

        } catch (error) {
            console.error("Error uploading:", error);
            toast.error(t('imageError'));
        } finally {
            setUploadingImage(null);
        }
    };

    if (loading) return <div className="p-12 text-center text-white">{t('loadingProfile')}</div>;

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div className="flex items-center gap-4 mb-6">
                <button onClick={() => router.back()} className="p-2 hover:bg-white/5 rounded-full text-slate-400 hover:text-white transition-colors">
                    <ArrowLeft size={24} />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-white">{t('title')}</h1>
                    <p className="text-slate-400 text-sm">{t('subtitle')}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left Column: Navigation / Summary (Optional, keeping simple for now) */}
                <div className="md:col-span-2 space-y-6">

                    {/* Images Section (Cover & Logo) */}
                    <GlassPanel className="p-6">
                        <div className="flex items-center gap-2 mb-4 text-brand-neon-cyan">
                            <ImageIcon size={20} />
                            <h2 className="font-bold text-white">{t('profileImages')}</h2>
                        </div>

                        <div className="space-y-6">
                            {/* Cover Image */}
                            <div>
                                <label className="block text-slate-400 text-xs uppercase mb-2">{t('coverImage')}</label>
                                <div className="relative w-full h-48 bg-black/40 rounded-xl overflow-hidden border border-white/10 group">
                                    {formData.coverImage ? (
                                        <img src={formData.coverImage} alt="Cover" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-600">
                                            <ImageIcon size={48} className="opacity-50" />
                                        </div>
                                    )}

                                    {/* Overlay Actions */}
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                        <label className="cursor-pointer px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg flex items-center gap-2 backdrop-blur-sm transition-colors">
                                            {uploadingImage === 'cover' ? <Loader2 className="animate-spin w-5 h-5" /> : <Upload size={18} />}
                                            <span className="text-sm font-medium">{t('changeCover')}</span>
                                            <input
                                                type="file"
                                                className="hidden"
                                                accept="image/*"
                                                onChange={(e) => handleImageUpload('cover', e)}
                                                disabled={uploadingImage !== null}
                                            />
                                        </label>
                                    </div>
                                </div>
                                <p className="text-xs text-slate-500 mt-1">{t('coverHint')}</p>
                            </div>

                            {/* Logo / Profile Image */}
                            <div>
                                <label className="block text-slate-400 text-xs uppercase mb-2">{t('logoImage')}</label>
                                <div className="flex items-center gap-4">
                                    <div className="relative w-24 h-24 rounded-full bg-black/40 border-2 border-white/10 overflow-hidden group shrink-0">
                                        {formData.logoUrl ? (
                                            <img src={formData.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-slate-600">
                                                <Building size={32} className="opacity-50" />
                                            </div>
                                        )}

                                        {/* Overlay Actions */}
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <label className="cursor-pointer p-2 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-sm transition-colors">
                                                {uploadingImage === 'logo' ? <Loader2 className="animate-spin w-5 h-5" /> : <Upload size={18} />}
                                                <input
                                                    type="file"
                                                    className="hidden"
                                                    accept="image/*"
                                                    onChange={(e) => handleImageUpload('logo', e)}
                                                    disabled={uploadingImage !== null}
                                                />
                                            </label>
                                        </div>
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-sm text-slate-300 mb-1">
                                            {t('logoHint')}
                                        </div>
                                        <label className="inline-flex cursor-pointer px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 rounded-lg items-center gap-2 transition-colors">
                                            {uploadingImage === 'logo' ? <Loader2 className="animate-spin w-4 h-4" /> : <Upload size={16} />}
                                            <span className="text-sm">{t('uploadLogo')}</span>
                                            <input
                                                type="file"
                                                className="hidden"
                                                accept="image/*"
                                                onChange={(e) => handleImageUpload('logo', e)}
                                                disabled={uploadingImage !== null}
                                            />
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </GlassPanel>

                    {/* Basic Info */}
                    <GlassPanel className="p-6">
                        <div className="flex items-center gap-2 mb-4 text-brand-neon-cyan">
                            <Building size={20} />
                            <h2 className="font-bold text-white">{t('basicInfo')}</h2>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-slate-400 text-xs uppercase mb-1">{t('businessName')}</label>
                                <input
                                    type="text"
                                    value={formData.businessName || ''}
                                    onChange={e => setFormData({ ...formData, businessName: e.target.value })}
                                    className="w-full bg-[#0B0F19] border border-white/10 rounded-lg px-4 py-2 text-white focus:border-brand-neon-cyan focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-slate-400 text-xs uppercase mb-1">{t('description')}</label>
                                <textarea
                                    value={formData.description || ''}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full bg-[#0B0F19] border border-white/10 rounded-lg px-4 py-2 text-white focus:border-brand-neon-cyan focus:outline-none h-24 resize-none"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-slate-400 text-xs uppercase mb-1">{t('phone')}</label>
                                    <input
                                        type="tel"
                                        value={formData.phone || ''}
                                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                        className="w-full bg-[#0B0F19] border border-white/10 rounded-lg px-4 py-2 text-white focus:border-brand-neon-cyan focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-slate-400 text-xs uppercase mb-1">{t('website')}</label>
                                    <input
                                        type="url"
                                        value={formData.website || ''}
                                        onChange={e => setFormData({ ...formData, website: e.target.value })}
                                        className="w-full bg-[#0B0F19] border border-white/10 rounded-lg px-4 py-2 text-white focus:border-brand-neon-cyan focus:outline-none"
                                    />
                                </div>
                            </div>

                            {/* Redes Sociales */}
                            <div className="pt-2 border-t border-white/5">
                                <label className="block text-slate-400 text-xs uppercase mb-3 flex items-center gap-2">
                                    <Share2 size={14} /> {t('socialMedia')}
                                </label>
                                <div className="space-y-2">
                                    {/* Instagram */}
                                    <div className="flex items-center gap-3 bg-[#0d1120] border border-white/8 rounded-xl px-3 h-12 focus-within:border-pink-500/60 focus-within:bg-pink-500/5 transition-all">
                                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shrink-0">
                                            <Instagram size={14} className="text-white" />
                                        </div>
                                        <span className="text-slate-500 text-sm shrink-0">@</span>
                                        <input
                                            type="text"
                                            value={(formData as any).socialMedia?.instagram || ''}
                                            onChange={e => setFormData({ ...formData, socialMedia: { ...(formData as any).socialMedia, instagram: e.target.value } } as any)}
                                            placeholder="tu_negocio"
                                            className="flex-1 bg-transparent text-white text-sm focus:outline-none placeholder:text-slate-600"
                                        />
                                    </div>
                                    {/* Facebook */}
                                    <div className="flex items-center gap-3 bg-[#0d1120] border border-white/8 rounded-xl px-3 h-12 focus-within:border-blue-500/60 focus-within:bg-blue-500/5 transition-all">
                                        <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
                                            <Facebook size={14} className="text-white" />
                                        </div>
                                        <span className="text-slate-600 text-xs shrink-0">fb.com/</span>
                                        <input
                                            type="text"
                                            value={(formData as any).socialMedia?.facebook || ''}
                                            onChange={e => setFormData({ ...formData, socialMedia: { ...(formData as any).socialMedia, facebook: e.target.value } } as any)}
                                            placeholder="tu.negocio"
                                            className="flex-1 bg-transparent text-white text-sm focus:outline-none placeholder:text-slate-600"
                                        />
                                    </div>
                                    {/* TikTok */}
                                    <div className="flex items-center gap-3 bg-[#0d1120] border border-white/8 rounded-xl px-3 h-12 focus-within:border-slate-400/60 focus-within:bg-white/5 transition-all">
                                        <div className="w-7 h-7 rounded-lg bg-[#111] border border-white/10 flex items-center justify-center shrink-0">
                                            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-white"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.17 8.17 0 0 0 4.78 1.53V6.79a4.85 4.85 0 0 1-1.01-.1z" /></svg>
                                        </div>
                                        <span className="text-slate-500 text-sm shrink-0">@</span>
                                        <input
                                            type="text"
                                            value={(formData as any).socialMedia?.tiktok || ''}
                                            onChange={e => setFormData({ ...formData, socialMedia: { ...(formData as any).socialMedia, tiktok: e.target.value } } as any)}
                                            placeholder="tu_negocio"
                                            className="flex-1 bg-transparent text-white text-sm focus:outline-none placeholder:text-slate-600"
                                        />
                                    </div>
                                </div>
                            </div>

                        </div>
                    </GlassPanel>



                    {/* Gallery - Replalced by PortfolioManager */}
                    <GlassPanel className="p-6">
                        <div className="flex items-center gap-2 mb-4 text-brand-neon-cyan">
                            <Camera size={20} />
                            <h2 className="font-bold text-white">{t('gallery')}</h2>
                        </div>
                        <p className="text-slate-400 text-sm mb-4">{t('gallerySubtitle')}</p>

                        <PortfolioManager businessId={user?.uid || ''} />
                    </GlassPanel>

                    {/* Opening Hours Section */}
                    <GlassPanel className="p-6">
                        <div className="flex items-center gap-2 mb-4 text-brand-neon-cyan">
                            <Clock size={20} />
                            <h2 className="font-bold text-white">{t('openingHours')}</h2>
                        </div>
                        <p className="text-slate-400 text-sm mb-4">
                            {t('openingHoursDesc')}
                        </p>
                        <div className="flex items-center justify-between bg-[#0B0F19] p-4 rounded-lg border border-white/5">
                            <div>
                                <span className="block text-white font-medium mb-1">
                                    {formData.openingHours ? t('scheduleSet') : t('scheduleNotSet')}
                                </span>
                                <span className="text-xs text-slate-500">
                                    {formData.openingHours ? t('scheduleActive') : t('scheduleDefault')}
                                </span>
                            </div>
                            <button
                                onClick={() => setScheduleOpen(true)}
                                className="text-xs px-3 py-1.5 bg-brand-neon-cyan/10 text-brand-neon-cyan border border-brand-neon-cyan/50 rounded-lg hover:bg-brand-neon-cyan/20 transition-colors font-bold"
                            >
                                {formData.openingHours ? t('editSchedule') : t('configure')}
                            </button>
                        </div>
                    </GlassPanel>

                    {/* Location */}
                    <GlassPanel className="p-6">
                        <div className="flex items-center gap-2 mb-4 text-brand-neon-cyan">
                            <MapPin size={20} />
                            <h2 className="font-bold text-white">{t('location')}</h2>
                        </div>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-slate-400 text-xs uppercase mb-1">{t('country')}</label>
                                    {/* Country is locked — determined by the CountryContext selection at app start */}
                                    <div className="w-full bg-[#0B0F19] border border-white/5 rounded-lg px-4 py-2 text-white flex items-center gap-2 opacity-70 select-none cursor-not-allowed" title="El país no puede cambiarse desde aquí">
                                        <span>{selectedCountry?.flag || '🌍'}</span>
                                        <span className="flex-1 font-medium">{selectedCountry?.name || formData.country}</span>
                                        <svg className="w-3.5 h-3.5 text-slate-500" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-slate-400 text-xs uppercase mb-1">{t('department')}</label>
                                    {(formData.country === 'HN' || !formData.country) ? (
                                        <select
                                            value={formData.department || ''}
                                            onChange={e => setFormData({ ...formData, department: e.target.value })}
                                            className="w-full bg-[#0B0F19] border border-white/10 rounded-lg px-4 py-2 text-white focus:border-brand-neon-cyan focus:outline-none"
                                        >
                                            <option value="">-- Seleccionar departamento --</option>
                                            <option>Atlántida</option>
                                            <option>Choluteca</option>
                                            <option>Colón</option>
                                            <option>Comayagua</option>
                                            <option>Copán</option>
                                            <option>Cortés</option>
                                            <option>El Paraíso</option>
                                            <option>Francisco Morazán</option>
                                            <option>Gracias a Dios</option>
                                            <option>Intibucá</option>
                                            <option>Islas de la Bahía</option>
                                            <option>La Paz</option>
                                            <option>Lempira</option>
                                            <option>Ocotepeque</option>
                                            <option>Olancho</option>
                                            <option>Santa Bárbara</option>
                                            <option>Valle</option>
                                            <option>Yoro</option>
                                        </select>
                                    ) : (
                                        <input
                                            type="text"
                                            value={formData.department || ''}
                                            onChange={e => setFormData({ ...formData, department: e.target.value })}
                                            placeholder="Estado / Provincia"
                                            className="w-full bg-[#0B0F19] border border-white/10 rounded-lg px-4 py-2 text-white focus:border-brand-neon-cyan focus:outline-none"
                                        />
                                    )}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-slate-400 text-xs uppercase mb-1">{t('city')}</label>
                                    <input
                                        type="text"
                                        value={formData.city || ''}
                                        onChange={e => setFormData({ ...formData, city: e.target.value })}
                                        placeholder="Ej: San Pedro Sula"
                                        className="w-full bg-[#0B0F19] border border-white/10 rounded-lg px-4 py-2 text-white focus:border-brand-neon-cyan focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-slate-400 text-xs uppercase mb-1">{t('address')}</label>
                                    <input
                                        type="text"
                                        value={formData.address || ''}
                                        onChange={e => setFormData({ ...formData, address: e.target.value })}
                                        placeholder="Ej: Col. Trejo, Blvd. Morazán"
                                        className="w-full bg-[#0B0F19] border border-white/10 rounded-lg px-4 py-2 text-white focus:border-brand-neon-cyan focus:outline-none"
                                    />
                                </div>
                            </div>
                        </div>
                    </GlassPanel>
                </div>

                {/* Right Column: Actions & Category Summary */}
                <div className="space-y-6">
                    <GlassPanel className="p-6 sticky top-6">
                        <h3 className="font-bold text-white mb-4">{t('actions')}</h3>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="w-full flex items-center justify-center gap-2 bg-brand-neon-cyan text-black font-bold py-3 rounded-xl hover:shadow-[0_0_20px_rgba(0,240,255,0.4)] transition-all disabled:opacity-50"
                        >
                            <Save size={18} />
                            {saving ? t('saving') : t('saveChanges')}
                        </button>
                    </GlassPanel>

                    <GlassPanel className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2 text-brand-neon-cyan">
                                <Tag size={20} />
                                <h3 className="font-bold text-white">{t('categoryTitle')}</h3>
                            </div>
                            <button
                                onClick={() => setShowMultiArea(!showMultiArea)}
                                className={`text-xs px-2 py-1 rounded border transition-colors ${showMultiArea ? 'bg-brand-neon-cyan/10 border-brand-neon-cyan text-brand-neon-cyan' : 'border-white/10 text-slate-500'}`}
                            >
                                {showMultiArea ? t('simpleMode') : t('additionalAreas')}
                            </button>
                        </div>

                        <div className="space-y-6">
                            {/* 1. Category Selection */}
                            <div>
                                <label className="block text-slate-400 text-xs uppercase mb-2">{t('mainArea')}</label>
                                <div className="grid grid-cols-1 gap-2">
                                    {Object.values(TAXONOMY).map(cat => {
                                        let Icon = Tag;
                                        if (cat.id === 'art_design') Icon = Palette;
                                        if (cat.id === 'general_services') Icon = Wrench;
                                        if (cat.id === 'beauty_wellness') Icon = Sparkles;

                                        const isPrimary = formData.category === cat.id;
                                        const isAdditional = formData.additionalCategories?.includes(cat.id);
                                        const isSelected = isPrimary || isAdditional;

                                        return (
                                            <button
                                                key={cat.id}
                                                onClick={() => {
                                                    if (showMultiArea) {
                                                        if (isPrimary) return;
                                                        const currentAdditional = formData.additionalCategories || [];
                                                        if (isAdditional) {
                                                            setFormData({
                                                                ...formData,
                                                                additionalCategories: currentAdditional.filter(id => id !== cat.id)
                                                            });
                                                        } else {
                                                            if (currentAdditional.length < 2) {
                                                                setFormData({
                                                                    ...formData,
                                                                    additionalCategories: [...currentAdditional, cat.id]
                                                                });
                                                            } else {
                                                                toast.error(t('maxAreas'));
                                                            }
                                                        }
                                                    } else {
                                                        setFormData({
                                                            ...formData,
                                                            category: cat.id,
                                                            subcategory: '',
                                                            specialties: [],
                                                            additionalCategories: [],
                                                            additionalSpecialties: []
                                                        });
                                                    }
                                                }}
                                                className={`
                                                    flex items-center gap-3 p-3 rounded-lg border text-left transition-all
                                                    ${isPrimary
                                                        ? 'bg-brand-neon-cyan/10 border-brand-neon-cyan text-white'
                                                        : isAdditional
                                                            ? 'bg-brand-neon-cyan/5 border-brand-neon-cyan/50 text-slate-200'
                                                            : 'bg-[#0B0F19] border-white/5 text-slate-400 hover:border-white/20'
                                                    }
                                                `}
                                            >
                                                <Icon size={20} className={isSelected ? 'text-brand-neon-cyan' : 'text-slate-500'} />
                                                <div className="flex-1">
                                                    <span className="text-sm font-medium">{cat.label[localeKey as keyof typeof cat.label]}</span>
                                                    {isPrimary && <span className="ml-2 text-[10px] bg-brand-neon-cyan text-black px-1.5 rounded font-bold">{t('badgePrimary')}</span>}
                                                    {isAdditional && <span className="ml-2 text-[10px] bg-white/10 text-slate-300 px-1.5 rounded">{t('badgeAdditional')}</span>}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* 2. Subcategory Selection */}
                            {formData.category && (
                                <div className="animate-in fade-in slide-in-from-top-2">
                                    <label className="block text-slate-400 text-xs uppercase mb-2">{t('mainSpecialty')}</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {Object.values(TAXONOMY).find(c => c.id === formData.category)?.subcategories.map(sub => {
                                            const isSelected = formData.subcategory === sub.id;

                                            // Icon Logic
                                            let SubIcon = Tag;
                                            if (['photography', 'camera'].some(k => sub.id.includes(k))) SubIcon = Camera;
                                            if (sub.id === 'videography') SubIcon = MonitorPlay;
                                            if (sub.id === 'music') SubIcon = Music;
                                            if (sub.id === 'hair') SubIcon = Scissors;
                                            if (sub.id === 'self_defense') SubIcon = Shield;
                                            if (['electrical', 'electric'].some(k => sub.id.includes(k))) SubIcon = Zap;
                                            if (['plumbing', 'water'].some(k => sub.id.includes(k))) SubIcon = Droplets;
                                            if (sub.id === 'painting') SubIcon = PaintBucket;
                                            if (sub.id === 'moving') SubIcon = Truck;
                                            if (sub.id === 'locksmith') SubIcon = Key;
                                            if (sub.id.includes('mechanic')) SubIcon = Car;
                                            if (sub.id === 'moto_mechanic') SubIcon = Bike;
                                            if (sub.id === 'gardening') SubIcon = Leaf;
                                            if (['nails', 'massage', 'skincare'].some(k => sub.id.includes(k))) SubIcon = Sparkles;

                                            return (
                                                <button
                                                    key={sub.id}
                                                    onClick={() => setFormData({
                                                        ...formData,
                                                        subcategory: sub.id,
                                                        specialties: []
                                                    })}
                                                    className={`
                                                        flex items-center gap-2 p-2 rounded border text-left transition-all
                                                        ${isSelected
                                                            ? 'bg-brand-neon-cyan/20 border-brand-neon-cyan text-white'
                                                            : 'bg-[#0B0F19] border-white/5 text-slate-400 hover:border-white/20'
                                                        }
                                                    `}
                                                >
                                                    <SubIcon size={14} className={isSelected ? 'text-brand-neon-cyan' : 'text-slate-500'} />
                                                    <span className="text-xs font-medium leading-tight">{sub.label[localeKey as keyof typeof sub.label]}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* 3. Specialties Selection */}
                            {formData.subcategory && (
                                <div className="animate-in fade-in slide-in-from-top-2">
                                    <label className="block text-slate-400 text-xs uppercase mb-2">{t('specificServices')}</label>
                                    <div className="flex flex-wrap gap-2">
                                        {(() => {
                                            const categoryData = Object.values(TAXONOMY).find(c => c.id === formData.category);
                                            const subData = categoryData?.subcategories.find(s => s.id === formData.subcategory);
                                            const rawSpecialties = subData?.specialties || [];
                                            const availableSpecialties = rawSpecialties.map(s =>
                                                typeof s === 'string' ? { es: s, en: s, pt: s } : s as any
                                            );

                                            if (availableSpecialties.length === 0) return <p className="text-xs text-slate-500 italic">{t('noOptions')}</p>;

                                            return availableSpecialties.map(spec => {
                                                const specKey = spec.es;
                                                const specLabel = spec[localeKey as keyof typeof spec] ?? spec.es;
                                                const isSelected = formData.specialties?.includes(specKey);
                                                return (
                                                    <button
                                                        key={specKey}
                                                        onClick={() => {
                                                            const current = formData.specialties || [];
                                                            if (isSelected) {
                                                                setFormData({ ...formData, specialties: current.filter(t => t !== specKey) });
                                                            } else {
                                                                if (current.length < 6) {
                                                                    setFormData({ ...formData, specialties: [...current, specKey] });
                                                                }
                                                            }
                                                        }}
                                                        className={`
                                                            text-xs px-2.5 py-1 rounded-full border transition-all flex items-center gap-1
                                                            ${isSelected
                                                                ? 'bg-brand-neon-cyan/10 border-brand-neon-cyan text-brand-neon-cyan'
                                                                : 'bg-transparent border-white/10 text-slate-400 hover:border-white/30'
                                                            }
                                                        `}
                                                    >
                                                        {isSelected && <Check size={10} />}
                                                        {specLabel}
                                                    </button>
                                                );
                                            });
                                        })()}
                                    </div>
                                </div>
                            )}
                        </div>
                    </GlassPanel>
                </div>
            </div>

            <WeeklyScheduleEditor
                isOpen={scheduleOpen}
                onClose={() => setScheduleOpen(false)}
                onSave={async (s) => handleSaveSchedule(s)}
                initialSchedule={formData.openingHours}
                title={t('scheduleTitle')}
                subtitle={t('scheduleSubtitle')}
                saveLabel={t('confirmSchedule')}
            />
        </div>
    );
}
