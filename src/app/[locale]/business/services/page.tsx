'use client';

import { useState, useEffect } from 'react';
import GlassPanel from '@/components/ui/GlassPanel';
import {
    Plus, Clock, Trash2, Edit2, X, AlertTriangle,
    Zap, Check, Sparkles, Tag, ChevronDown
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { ServicesService, ServiceData, BusinessProfileService, getServiceName } from '@/services/businessProfile.service';
import { useTranslations, useLocale } from 'next-intl';
import { TAXONOMY } from '@/lib/taxonomy';

const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120];
const CUSTOM_VALUE = -1; // sentinel for "Otro"


const formatDuration = (min: number) => {
    if (min < 60) return `${min} min`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m > 0 ? `${h}h ${m}min` : `${h}h`;
};

export default function ServicesPage() {
    const { user } = useAuth();
    const t = useTranslations('business.services');
    const locale = useLocale();
    const localeKey = locale === 'en' ? 'en' : locale === 'pt-BR' ? 'pt' : 'es';

    // Translate a specialty string (stored as .es in Firestore) to the active locale
    const getSpecLabel = (specEs: string): string => {
        for (const cat of Object.values(TAXONOMY)) {
            for (const sub of cat.subcategories) {
                const found = sub.specialties.find(s => s.es === specEs);
                if (found) return found[localeKey as keyof typeof found] as string || specEs;
            }
        }
        return specEs; // fallback — matches display name if already in locale
    };
    const [services, setServices] = useState<ServiceData[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [serviceToDelete, setServiceToDelete] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Custom duration (hours 0-23 + minutes 0-59)
    const [useCustomDuration, setUseCustomDuration] = useState(false);
    const [customHours, setCustomHours] = useState(0);
    const [customMins, setCustomMins] = useState(30);

    // Business specialties — loaded once
    const [businessSpecialties, setBusinessSpecialties] = useState<string[]>([]);

    const defaultForm = (): ServiceData => ({
        name: '',
        nameI18n: { es: '', en: '', pt: '' },
        description: '',
        price: 0,
        durationMinutes: 60,
        currency: 'L.',
        category: '',
        isExtra: false,
        isActive: true,
    });

    const [formData, setFormData] = useState<ServiceData>(defaultForm());

    const fetchServices = async () => {
        if (!user) return;
        setLoading(true);
        const data = await ServicesService.getServices(user.uid);
        // Sort: regular first, extra last
        data.sort((a, b) => (a.isExtra ? 1 : 0) - (b.isExtra ? 1 : 0));
        setServices(data);
        setLoading(false);
    };

    useEffect(() => {
        if (!user) return;
        fetchServices();
        // Load business specialties for suggestions
        BusinessProfileService.getProfile(user.uid).then(profile => {
            if (profile?.specialties?.length) {
                setBusinessSpecialties(profile.specialties);
            }
        }).catch(() => { });
    }, [user]);

    const openModal = (service?: ServiceData) => {
        if (service) {
            setFormData({ ...service });
            setEditingId(service.id!);
            // Check if the stored duration is a predefined value
            const isPredefined = DURATION_OPTIONS.includes(service.durationMinutes);
            if (!isPredefined) {
                setUseCustomDuration(true);
                setCustomHours(Math.floor(service.durationMinutes / 60));
                setCustomMins(service.durationMinutes % 60);
            } else {
                setUseCustomDuration(false);
            }
        } else {
            setFormData(defaultForm());
            setEditingId(null);
            setUseCustomDuration(false);
            setCustomHours(0);
            setCustomMins(30);
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const primaryName = formData.nameI18n?.es?.trim() || formData.name.trim();
        if (!user || !primaryName || formData.price === undefined) return;

        setIsSubmitting(true);
        try {
            const resolvedDuration = useCustomDuration
                ? Math.max(1, customHours * 60 + customMins)
                : Number(formData.durationMinutes) || 60;

            const payload: Omit<ServiceData, 'id'> = {
                name: formData.nameI18n?.es?.trim() || formData.name.trim(),
                nameI18n: {
                    es: formData.nameI18n?.es?.trim() || formData.name.trim(),
                    en: formData.nameI18n?.en?.trim() || formData.name.trim(),
                    pt: formData.nameI18n?.pt?.trim() || formData.name.trim(),
                },
                description: formData.description || '',
                price: Number(formData.price),
                durationMinutes: resolvedDuration,
                currency: formData.currency || 'L.',
                category: formData.category || '',
                isExtra: formData.isExtra || false,
                isActive: formData.isActive !== false,
            };

            if (editingId) {
                await ServicesService.updateService(user.uid, editingId, payload);
                toast.success(t('updated'));
            } else {
                await ServicesService.addService(user.uid, payload);
                toast.success(t('created'));
            }
            setIsModalOpen(false);
            fetchServices();
        } catch (error) {
            toast.error(t('saveError'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!serviceToDelete || !user) return;
        const id = serviceToDelete;
        setServiceToDelete(null);
        try {
            await ServicesService.deleteService(user.uid, id);
            toast.success(t('deleted'));
            fetchServices();
        } catch {
            toast.error(t('deleteError'));
        }
    };

    const regularServices = services.filter(s => !s.isExtra);
    const extraServices = services.filter(s => s.isExtra);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-white">{t('title')}</h1>
                    <p className="text-slate-400 text-sm">{t('subtitle')}</p>
                </div>
                <button
                    onClick={() => openModal()}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-xl text-sm font-bold text-white hover:opacity-90 transition-opacity shadow-[0_0_20px_rgba(0,200,255,0.25)]"
                >
                    <Plus size={16} /> {t('add')}
                </button>
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex justify-center p-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-500" />
                </div>
            ) : services.length === 0 ? (
                <GlassPanel className="p-12 flex flex-col items-center justify-center min-h-[400px] text-center border-dashed border-white/20">
                    <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-4 text-slate-500">
                        <Clock size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">{t('emptyTitle')}</h3>
                    <p className="text-slate-400 max-w-sm mb-6">
                        {t('emptyDesc')}
                    </p>
                    <button
                        onClick={() => openModal()}
                        className="px-4 py-2 bg-brand-neon-cyan/10 hover:bg-brand-neon-cyan/20 border border-brand-neon-cyan/30 text-brand-neon-cyan rounded-xl text-sm font-bold transition-colors"
                    >
                        {t('addFirst')}
                    </button>
                </GlassPanel>
            ) : (
                <div className="space-y-8">
                    {/* Regular Services */}
                    {regularServices.length > 0 && (
                        <div>
                            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                <Tag size={14} /> {t('mainServices')}
                                <span className="bg-white/5 text-slate-500 text-xs px-2 py-0.5 rounded-full">{regularServices.length}</span>
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {regularServices.map(service => (
                                    <ServiceCard
                                        key={service.id}
                                        service={service}
                                        locale={locale}
                                        onEdit={() => openModal(service)}
                                        onDelete={() => setServiceToDelete(service.id!)}
                                        extraLabel={t('extraServiceBadge')}
                                        noDescLabel={t('noDescription')}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Extra Services */}
                    {extraServices.length > 0 && (
                        <div>
                            <h2 className="text-sm font-semibold text-amber-400/80 uppercase tracking-wider mb-3 flex items-center gap-2">
                                <Zap size={14} className="text-amber-400" /> {t('extraServices')}
                                <span className="bg-amber-500/10 text-amber-400 text-xs px-2 py-0.5 rounded-full">{extraServices.length}</span>
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {extraServices.map(service => (
                                    <ServiceCard
                                        key={service.id}
                                        service={service}
                                        locale={locale}
                                        onEdit={() => openModal(service)}
                                        onDelete={() => setServiceToDelete(service.id!)}
                                        extraLabel={t('extraServiceBadge')}
                                        noDescLabel={t('noDescription')}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Service Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-[#0f1629] border border-white/8 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                            <div>
                                <h2 className="text-lg font-bold text-white">
                                    {editingId ? t('editService') : t('add')}
                                </h2>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    {t('modalSubtitle')}
                                </p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-1.5 text-slate-500 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">

                            {/* Specialty Suggestions */}
                            {businessSpecialties.length > 0 && !editingId && (
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-2 flex items-center gap-1.5">
                                        <Sparkles size={12} /> {t('yourSpecialties')}
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {businessSpecialties.map(spec => (
                                            <button
                                                key={spec}
                                                type="button"
                                                onClick={() => setFormData(prev => {
                                                    // Auto-fill all 3 names from taxonomy
                                                    const nameEs = spec;
                                                    const nameEn = (() => {
                                                        for (const cat of Object.values(TAXONOMY)) {
                                                            for (const sub of cat.subcategories) {
                                                                const found = sub.specialties.find(s => s.es === spec);
                                                                if (found) return found.en;
                                                            }
                                                        }
                                                        return spec;
                                                    })();
                                                    const namePt = (() => {
                                                        for (const cat of Object.values(TAXONOMY)) {
                                                            for (const sub of cat.subcategories) {
                                                                const found = sub.specialties.find(s => s.es === spec);
                                                                if (found) return found.pt;
                                                            }
                                                        }
                                                        return spec;
                                                    })();
                                                    return {
                                                        ...prev,
                                                        name: nameEs,
                                                        nameI18n: { es: nameEs, en: nameEn, pt: namePt },
                                                        category: spec,
                                                    };
                                                })}
                                                className={`text-xs px-3 py-1.5 rounded-full border transition-all
                                                    ${formData.category === spec
                                                        ? 'bg-brand-neon-cyan/15 border-brand-neon-cyan text-brand-neon-cyan'
                                                        : 'border-white/10 text-slate-400 hover:border-white/30 hover:text-slate-200'
                                                    }`}
                                            >
                                                {formData.category === spec && <Check size={10} className="inline mr-1" />}
                                                {getSpecLabel(spec)}
                                            </button>
                                        ))}
                                    </div>
                                    <p className="text-xs text-slate-600 mt-1.5">{t('tapToUseName')}</p>
                                </div>
                            )}

                            {/* Name — 3 language inputs */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">
                                    {t('serviceName')} *
                                </label>
                                <div className="space-y-2">
                                    {([['es', '🇪🇸'], ['en', '🇺🇸'], ['pt', '🇧🇷']] as const).map(([lang, flag]) => (
                                        <div key={lang} className="flex items-center gap-2">
                                            <span className="text-lg shrink-0">{flag}</span>
                                            <input
                                                type="text"
                                                required={lang === 'es'}
                                                value={formData.nameI18n?.[lang] ?? ''}
                                                onChange={e => setFormData(prev => ({
                                                    ...prev,
                                                    name: lang === 'es' ? e.target.value : prev.name,
                                                    nameI18n: { ...prev.nameI18n!, [lang]: e.target.value } as any
                                                }))}
                                                className="flex-1 bg-[#0B0F19] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-brand-neon-cyan focus:outline-none transition-colors placeholder:text-slate-600 text-sm"
                                                placeholder={lang === 'es' ? t('serviceNamePlaceholder') : lang === 'en' ? 'e.g. Regular Cut...' : 'Ex. Corte Regular...'}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1.5">{t('description')}</label>
                                <textarea
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full bg-[#0B0F19] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-brand-neon-cyan focus:outline-none resize-none h-20 placeholder:text-slate-600 transition-colors"
                                    placeholder={t('descriptionPlaceholder')}
                                />
                            </div>

                            {/* Price + Duration row */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-1.5">{t('price')} *</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-3.5 text-slate-500 text-sm font-medium">{formData.currency}</span>
                                        <input
                                            type="number"
                                            required
                                            min="0"
                                            step="any"
                                            placeholder="0.00"
                                            value={formData.price === 0 ? '' : formData.price}
                                            onChange={e => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                                            className="w-full bg-[#0B0F19] border border-white/10 rounded-xl pl-9 pr-4 py-3 text-white focus:border-brand-neon-cyan focus:outline-none transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-1.5 flex items-center gap-1">
                                        <Clock size={11} /> {t('duration')} *
                                    </label>
                                    {/* Predefined + "Otro" selector */}
                                    <div className="relative">
                                        <select
                                            value={useCustomDuration ? CUSTOM_VALUE : formData.durationMinutes}
                                            onChange={e => {
                                                const val = Number(e.target.value);
                                                if (val === CUSTOM_VALUE) {
                                                    setUseCustomDuration(true);
                                                } else {
                                                    setUseCustomDuration(false);
                                                    setFormData({ ...formData, durationMinutes: val });
                                                }
                                            }}
                                            className="w-full bg-[#0B0F19] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-brand-neon-cyan focus:outline-none appearance-none transition-colors"
                                        >
                                            {DURATION_OPTIONS.map(d => (
                                                <option key={d} value={d}>{formatDuration(d)}</option>
                                            ))}
                                            <option value={CUSTOM_VALUE}>{t('other')}</option>
                                        </select>
                                        <ChevronDown size={14} className="absolute right-3 top-4 text-slate-500 pointer-events-none" />
                                    </div>
                                    {/* Custom H:M picker */}
                                    {useCustomDuration && (
                                        <div className="mt-2 bg-[#0B0F19] border border-brand-neon-cyan/30 rounded-xl px-4 py-3 animate-in fade-in slide-in-from-top-1 duration-150">
                                            <div className="flex items-center gap-2">
                                                <Clock size={14} className="text-brand-neon-cyan shrink-0" />
                                                <div className="flex items-center gap-2">
                                                    <div className="flex flex-col items-center">
                                                        <span className="text-[10px] text-slate-500 mb-1">{t('hours')}</span>
                                                        <input
                                                            type="number"
                                                            min={0}
                                                            max={23}
                                                            value={customHours}
                                                            onChange={e => setCustomHours(Math.min(23, Math.max(0, Number(e.target.value))))}
                                                            className="w-14 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white text-center text-sm focus:border-brand-neon-cyan focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                        />
                                                    </div>
                                                    <span className="text-slate-400 font-bold mt-4">:</span>
                                                    <div className="flex flex-col items-center">
                                                        <span className="text-[10px] text-slate-500 mb-1">{t('minutes')}</span>
                                                        <input
                                                            type="number"
                                                            min={0}
                                                            max={59}
                                                            step={5}
                                                            value={customMins}
                                                            onChange={e => setCustomMins(Math.min(59, Math.max(0, Number(e.target.value))))}
                                                            className="w-14 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white text-center text-sm focus:border-brand-neon-cyan focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                            <p className="text-brand-neon-cyan text-xs font-bold mt-2 pl-5">
                                                = {formatDuration(customHours * 60 + customMins)}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* isExtra Toggle */}
                            <div
                                onClick={() => setFormData(prev => ({ ...prev, isExtra: !prev.isExtra }))}
                                className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all select-none
                                    ${formData.isExtra
                                        ? 'bg-amber-500/10 border-amber-500/40'
                                        : 'bg-white/3 border-white/8 hover:bg-white/5'
                                    }`}
                            >
                                <div className={`w-10 h-6 rounded-full relative transition-colors ${formData.isExtra ? 'bg-amber-500' : 'bg-white/10'}`}>
                                    <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${formData.isExtra ? 'left-5' : 'left-1'}`} />
                                </div>
                                <div>
                                    <p className={`text-sm font-semibold ${formData.isExtra ? 'text-amber-300' : 'text-slate-300'}`}>
                                        <Zap size={13} className="inline mr-1" />
                                        {t('extraService')}
                                    </p>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        {t('extraServiceDesc')}
                                    </p>
                                </div>
                            </div>

                            {/* Submit */}
                            <button
                                type="submit"
                                disabled={isSubmitting || !formData.name}
                                className="w-full py-3.5 bg-brand-neon-cyan hover:bg-brand-neon-cyan/90 text-black font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(0,240,255,0.2)] hover:shadow-[0_0_30px_rgba(0,240,255,0.35)] flex items-center justify-center gap-2"
                            >
                                {isSubmitting ? (
                                    <><div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" /> {t('saving')}</>
                                ) : (
                                    <><Check size={16} /> {editingId ? t('saveChanges') : t('createService')}</>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation */}
            {serviceToDelete && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-[#0f1629] border border-white/10 w-full max-w-sm rounded-2xl p-6 shadow-2xl">
                        <div className="flex flex-col items-center text-center mb-6">
                            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4 text-red-500">
                                <AlertTriangle size={24} />
                            </div>
                            <h3 className="font-bold text-white text-lg mb-2">{t('deleteTitle')}</h3>
                            <p className="text-slate-400 text-sm">{t('deleteDesc')}</p>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setServiceToDelete(null)} className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl font-medium transition-colors">
                                {t('cancel')}
                            </button>
                            <button onClick={handleDelete} className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold transition-colors">
                                {t('delete')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

/* ── Service Card Component ── */
function ServiceCard({ service, onEdit, onDelete, extraLabel, noDescLabel, locale }: {
    service: ServiceData;
    onEdit: () => void;
    onDelete: () => void;
    extraLabel?: string;
    noDescLabel?: string;
    locale?: string;
}) {
    const displayName = getServiceName(service, locale || 'es');
    return (
        <GlassPanel className={`p-5 flex flex-col group relative overflow-visible transition-all hover:border-brand-neon-cyan/25
            ${service.isExtra ? 'border-amber-500/15' : ''}`}>

            {/* Badges */}
            <div className="flex items-start justify-between mb-3 gap-2">
                <h3 className="font-bold text-white text-base leading-tight pr-12">{displayName}</h3>
                <div className="flex gap-1 absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity bg-[#0B0F19] rounded-lg p-1">
                    <button onClick={onEdit} className="p-1.5 hover:text-brand-neon-cyan text-slate-400 transition-colors"><Edit2 size={14} /></button>
                    <button onClick={onDelete} className="p-1.5 hover:text-red-400 text-slate-400 transition-colors"><Trash2 size={14} /></button>
                </div>
            </div>

            {/* Extra badge */}
            {service.isExtra && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full mb-2 w-fit">
                    <Zap size={9} /> {extraLabel || 'EXTRA'}
                </span>
            )}

            {/* Category */}
            {service.category && (
                <span className="text-xs text-slate-500 mb-2">{service.category}</span>
            )}

            <p className="text-slate-400 text-sm mb-4 line-clamp-2 min-h-[40px] flex-1">
                {service.description || noDescLabel || '—'}
            </p>

            <div className="mt-auto pt-3 border-t border-white/5 flex items-center justify-between">
                <span className="text-lg font-bold text-white">
                    {service.currency} {Number(service.price).toLocaleString('es-HN', { minimumFractionDigits: 2 })}
                </span>
                <span className="flex items-center gap-1 text-xs text-slate-500 bg-white/5 px-2 py-1 rounded-lg">
                    <Clock size={11} /> {service.durationMinutes ? formatDuration(service.durationMinutes) : '—'}
                </span>
            </div>
        </GlassPanel>
    );
}
