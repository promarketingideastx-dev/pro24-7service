'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { BusinessProfileService, BusinessProfileData } from '@/services/businessProfile.service';
import WizardSteps from '@/components/business/setup/WizardSteps';
import GlassPanel from '@/components/ui/GlassPanel';
import ImageUploader from '@/components/ui/ImageUploader';
import {
    Building, MapPin, Tag, Check, ArrowRight, ArrowLeft,
    MonitorPlay, Camera, Palette, Music, Scissors, Shield, // Art
    Wrench, Zap, Droplets, PaintBucket, Truck, Key, Car, Bike, Leaf, // General
    Heart, Sparkles, Smile, Footprints // Beauty
} from 'lucide-react';
import { TAXONOMY } from '@/lib/taxonomy';
import { useCountry } from '@/context/CountryContext';
import { getCountryConfig } from '@/lib/locations';
import { ActiveCountry } from '@/lib/activeCountry';

const STEPS = [
    { id: 1, title: 'Información', icon: Building },
    { id: 2, title: 'Ubicación', icon: MapPin },
    { id: 3, title: 'Categoría', icon: Tag },
    { id: 4, title: 'Galería', icon: Camera }, // New Step
    { id: 5, title: 'Revisión', icon: Check },
];

export default function BusinessSetupPage() {
    const { user, userProfile } = useAuth();
    // const { selectedCountry } = useCountry(); // Remove direct context usage if we want strict ActiveCountry
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showMultiArea, setShowMultiArea] = useState(false); // Toggle for additional areas

    // Active Country Logic
    // const activeCountryCode = ActiveCountry.get(); // Moved to State initialization to avoid hydration mismatch? 
    // Actually, get() returns DEFAULT if server. If client has different value in localStorage, 
    // we get a mismatch.

    // Initialize State with safe default
    const [formData, setFormData] = useState<Partial<BusinessProfileData>>({
        businessName: '',
        description: '',
        phone: '',
        email: user?.email || '',
        website: '',
        country: 'HN', // Safe default for server render
        city: '',
        department: '',
        address: '',
        category: '',
        subcategory: '',
        specialties: [],
        additionalCategories: [], // New: Multi-select areas
        additionalSpecialties: [], // New: Multi-select specialties (reserved if needed, but we use 'specialties' for chips)
        modality: 'local',
        images: []
    });

    // Effect: Enforce Active Country alignment on mount
    useEffect(() => {
        // Now valid to read from storage/cookies
        const current = ActiveCountry.get();
        if (formData.country !== current) {
            setFormData(prev => ({
                ...prev,
                country: current
            }));
        }
    }, []);

    // Effect: Enforce Active Country alignment on mount (or if user changes context outside)
    // Also handles "Editing" mode if we were to support it later (syncing profile country to active)
    useEffect(() => {
        const current = ActiveCountry.get();
        if (formData.country !== current) {
            setFormData(prev => ({
                ...prev,
                country: current,
                department: '', // Reset geo dependants
                city: ''
            }));
        }
    }, []);

    const handleNext = () => {
        if (currentStep < 5) setCurrentStep(c => c + 1);
    };

    const handleBack = () => {
        if (currentStep > 1) setCurrentStep(c => c - 1);
    };

    const isStepValid = () => {
        if (currentStep === 1) return !!formData.businessName;
        if (currentStep === 2) return !!formData.city && !!formData.department; // Validate Dept + City
        if (currentStep === 3) return !!formData.category;
        if (currentStep === 4) return (formData.images?.length || 0) > 0; // Require at least 1 image
        return true;
    };

    const handleSubmit = async () => {
        if (!user) return;
        setIsSubmitting(true);
        try {
            // Prepare data strictly typed
            const payload: BusinessProfileData = {
                businessName: formData.businessName!,
                description: formData.description || '',
                category: formData.category!,
                subcategory: formData.subcategory || '',
                // Map Chips to additionalSpecialties as requested + keep in tags for search
                additionalSpecialties: formData.specialties || [],
                specialties: formData.specialties || [],
                additionalCategories: formData.additionalCategories || [],
                modality: formData.modality as any || 'local',
                address: formData.address,
                city: formData.city,
                department: formData.department!, // Pass department
                country: formData.country,
                images: formData.images || [],
                userId: user.uid,
                email: formData.email!,
                phone: formData.phone
            };

            await BusinessProfileService.createProfile(user.uid, payload);

            // Redirect to dashboard
            router.push('/business/dashboard');
        } catch (error: any) {
            console.error("Setup Error:", error);
            alert(`Error al crear negocio: ${error.message}`);
            setIsSubmitting(false);
        }
    };

    // Render Steps
    const renderStepContent = () => {
        switch (currentStep) {
            case 1:
                return (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-slate-400 text-sm mb-1">Nombre del Negocio *</label>
                            <input
                                type="text"
                                value={formData.businessName}
                                onChange={e => setFormData({ ...formData, businessName: e.target.value })}
                                className="w-full h-12 bg-[#151b2e] border border-white/10 rounded-lg px-4 text-white focus:outline-none focus:border-brand-neon-cyan"
                                placeholder="Ej: Barbería El Corte"
                            />
                        </div>
                        <div>
                            <label className="block text-slate-400 text-sm mb-1">Eslogan o Descripción Corta</label>
                            <textarea
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                className="w-full h-24 bg-[#151b2e] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-brand-neon-cyan resize-none"
                                placeholder="Ej: Calidad y estilo en cada corte."
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-slate-400 text-sm mb-1">Teléfono</label>
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                    className="w-full h-12 bg-[#151b2e] border border-white/10 rounded-lg px-4 text-white focus:outline-none focus:border-brand-neon-cyan"
                                    placeholder={`${getCountryConfig((formData.country as any) || 'HN').phonePrefix} 0000-0000`}
                                />
                            </div>
                            <div>
                                <label className="block text-slate-400 text-sm mb-1">Sitio Web (Opcional)</label>
                                <input
                                    type="url"
                                    value={formData.website}
                                    onChange={e => setFormData({ ...formData, website: e.target.value })}
                                    className="w-full h-12 bg-[#151b2e] border border-white/10 rounded-lg px-4 text-white focus:outline-none focus:border-brand-neon-cyan"
                                    placeholder="https://..."
                                />
                            </div>
                        </div>
                    </div>
                );
            case 2:
                const currentCountryConfig = getCountryConfig((formData.country as any) || 'HN');
                const regions = currentCountryConfig.states || [];

                return (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-slate-400 text-sm mb-1">País</label>
                                <div className="w-full h-12 bg-[#151b2e]/50 border border-white/5 rounded-lg px-4 flex items-center text-slate-400 cursor-not-allowed">
                                    {currentCountryConfig.name} ({currentCountryConfig.code})
                                </div>
                            </div>
                            <div>
                                <label className="block text-slate-400 text-sm mb-1">{currentCountryConfig.regionLabel} *</label>
                                <select
                                    value={formData.department || ''}
                                    onChange={e => {
                                        const selectedRegion = regions.find(l => l.name === e.target.value);
                                        setFormData({
                                            ...formData,
                                            department: e.target.value,
                                            // Auto-capital logic is valid for HN, can be adjusted for others later
                                            city: selectedRegion?.cities?.[0] || ''
                                        });
                                    }}
                                    className="w-full h-12 bg-[#151b2e] border border-white/10 rounded-lg px-4 text-white focus:outline-none focus:border-brand-neon-cyan"
                                >
                                    <option value="">Selecciona...</option>
                                    {regions.map(reg => (
                                        <option key={reg.name} value={reg.name}>{reg.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-slate-400 text-sm mb-1">Ciudad / Cabecera *</label>
                            {(() => {
                                const selectedRegion = regions.find(l => l.name === formData.department);
                                const hasPredefinedCities = selectedRegion?.cities && selectedRegion.cities.length > 0;

                                return (
                                    <input
                                        type="text"
                                        value={formData.city}
                                        readOnly={!!hasPredefinedCities}
                                        onChange={e => !hasPredefinedCities && setFormData({ ...formData, city: e.target.value })}
                                        className={`w-full h-12 rounded-lg px-4 focus:outline-none transition-colors
                                            ${hasPredefinedCities
                                                ? 'bg-[#151b2e]/50 border border-white/5 text-slate-400 cursor-not-allowed'
                                                : 'bg-[#151b2e] border border-white/10 text-white focus:border-brand-neon-cyan'
                                            }
                                        `}
                                        placeholder={hasPredefinedCities ? "Se selecciona automáticamente" : "Escribe tu ciudad"}
                                    />
                                );
                            })()}
                            <p className="text-xs text-slate-500 mt-1">
                                {regions.find(l => l.name === formData.department)?.cities?.length
                                    ? `La cabecera se selecciona automáticamente según el ${currentCountryConfig.regionLabel.toLowerCase()}.`
                                    : "Ingresa el nombre de tu ciudad manualmente."
                                }
                            </p>
                        </div>

                        <div>
                            <label className="block text-slate-400 text-sm mb-1">Dirección Exacta (Barrio/Colonia)</label>
                            <input
                                type="text"
                                value={formData.address}
                                onChange={e => setFormData({ ...formData, address: e.target.value })}
                                className="w-full h-12 bg-[#151b2e] border border-white/10 rounded-lg px-4 text-white focus:outline-none focus:border-brand-neon-cyan"
                                placeholder="Colonia, Calle, # de Casa/Local"
                            />
                        </div>
                        <div>
                            <label className="block text-slate-400 text-sm mb-1">Modalidad</label>
                            <div className="grid grid-cols-3 gap-2">
                                {['local', 'home', 'both'].map((m) => (
                                    <button
                                        key={m}
                                        onClick={() => setFormData({ ...formData, modality: m as any })}
                                        className={`h-10 rounded border text-sm font-medium transition-colors
                                            ${formData.modality === m
                                                ? 'bg-brand-neon-cyan/20 border-brand-neon-cyan text-white'
                                                : 'bg-[#151b2e] border-white/10 text-slate-400 hover:border-white/30'
                                            }
                                        `}
                                    >
                                        {m === 'local' ? 'En Local' : m === 'home' ? 'A Domicilio' : 'Ambos'}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                );
            case 3:
                return (
                    <div className="space-y-6">
                        {/* 1. Categoría Principal (Grid) + Toggle Multi */}
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <label className="block text-slate-400 text-sm">¿En qué área trabajas? *</label>
                                <button
                                    onClick={() => setShowMultiArea(!showMultiArea)}
                                    className={`text-xs px-2 py-1 rounded border transition-colors ${showMultiArea ? 'bg-brand-neon-cyan/10 border-brand-neon-cyan text-brand-neon-cyan' : 'border-white/10 text-slate-500'}`}
                                >
                                    {showMultiArea ? 'Modo Simple' : 'Agregar otra área (Opcional)'}
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                {Object.values(TAXONOMY).map(cat => {
                                    // Icon Mapping
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
                                                    // Multi-select Logic
                                                    if (isPrimary) return; // Can't deselect primary directly here, user should switch mode or pick another primary first?
                                                    // Actually, just toggle Additional
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
                                                            alert("Máximo 2 áreas adicionales permitidas.");
                                                        }
                                                    }
                                                } else {
                                                    // Single Select Logic (Standard)
                                                    setFormData({
                                                        ...formData,
                                                        category: cat.id,
                                                        subcategory: '',
                                                        specialties: [],
                                                        additionalCategories: [], // Reset additional if executing primary switch in single mode
                                                        additionalSpecialties: []
                                                    });
                                                }
                                            }}
                                            className={`
                                                flex flex-col items-center justify-center p-4 rounded-xl border transition-all duration-200 relative
                                                ${isPrimary
                                                    ? 'bg-brand-neon-cyan/10 border-brand-neon-cyan text-white shadow-[0_0_15px_rgba(0,240,255,0.15)] ring-1 ring-brand-neon-cyan'
                                                    : isAdditional
                                                        ? 'bg-brand-neon-cyan/5 border-brand-neon-cyan/50 text-slate-200'
                                                        : 'bg-[#151b2e] border-white/5 text-slate-400 hover:border-white/20 hover:bg-[#1a233b]'
                                                }
                                            `}
                                        >
                                            {isPrimary && <div className="absolute top-2 right-2 text-xs bg-brand-neon-cyan text-black px-1.5 rounded font-bold">Principal</div>}
                                            {isAdditional && <div className="absolute top-2 right-2 text-xs bg-white/10 text-slate-300 px-1.5 rounded">Adicional</div>}

                                            <Icon size={32} className={`mb-3 ${isSelected ? 'text-brand-neon-cyan' : 'text-slate-500'}`} />
                                            <span className="font-medium text-center">{cat.label.es}</span>
                                        </button>
                                    );
                                })}
                            </div>
                            {/* Chips for Additional Areas */}
                            {formData.additionalCategories && formData.additionalCategories.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-2 animate-in fade-in">
                                    <span className="text-xs text-slate-500 mr-2 self-center">Áreas adicionales:</span>
                                    {formData.additionalCategories.map(catId => {
                                        const catLabel = Object.values(TAXONOMY).find(c => c.id === catId)?.label.es;
                                        return (
                                            <span key={catId} className="bg-white/5 border border-white/10 text-slate-300 text-xs px-2 py-1 rounded-full flex items-center gap-1">
                                                {catLabel}
                                                <button onClick={() => setFormData({
                                                    ...formData,
                                                    additionalCategories: formData.additionalCategories?.filter(id => id !== catId)
                                                })} className="hover:text-white">×</button>
                                            </span>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* 2. Subcategoría (Pills / Cards) - Only for Primary Category */}
                        {formData.category && (
                            <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                                <label className="block text-slate-400 text-sm mb-3">Selecciona tu especialidad principal:</label>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {Object.values(TAXONOMY).find(c => c.id === formData.category)?.subcategories.map(sub => {
                                        const isSelected = formData.subcategory === sub.id;
                                        // Simple Icon Logic based on ID keywords or generic
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
                                        if (sub.id.includes('mechanic')) SubIcon = Car; // Default car
                                        if (sub.id === 'moto_mechanic') SubIcon = Bike;
                                        if (sub.id === 'gardening') SubIcon = Leaf;
                                        if (['nails', 'massage', 'skincare'].some(k => sub.id.includes(k))) SubIcon = Sparkles; // Generic beauty

                                        return (
                                            <button
                                                key={sub.id}
                                                onClick={() => setFormData({
                                                    ...formData,
                                                    subcategory: sub.id,
                                                    specialties: []
                                                })}
                                                className={`
                                                    flex items-center gap-3 p-3 rounded-lg border text-left transition-all
                                                    ${isSelected
                                                        ? 'bg-brand-neon-cyan/20 border-brand-neon-cyan text-white'
                                                        : 'bg-[#151b2e]/50 border-white/5 text-slate-400 hover:border-white/20 hover:text-slate-200'
                                                    }
                                                `}
                                            >
                                                <div className={`p-2 rounded-full ${isSelected ? 'bg-brand-neon-cyan/20' : 'bg-white/5'}`}>
                                                    <SubIcon size={18} className={isSelected ? 'text-brand-neon-cyan' : 'text-slate-500'} />
                                                </div>
                                                <span className="text-sm font-medium leading-tight">{sub.label.es}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* 3. Especialidades (Chips) - Multi-select */}
                        {formData.subcategory && (
                            <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                                <label className="block text-slate-400 text-sm mb-3">Detalles específicos (Opcional):</label>

                                {/* Logic to get available specialties */}
                                {(() => {
                                    const categoryData = Object.values(TAXONOMY).find(c => c.id === formData.category);
                                    let availableSpecialties: string[] = [];

                                    // Since we force subcategory selection above for flow, we just check subcategory here
                                    if (categoryData && formData.subcategory) {
                                        const subData = categoryData.subcategories.find(s => s.id === formData.subcategory);
                                        availableSpecialties = subData?.specialties || [];
                                    }

                                    return (
                                        <div className="bg-[#151b2e]/30 border border-white/5 rounded-xl p-4">
                                            <div className="flex flex-wrap gap-2">
                                                {availableSpecialties.map(spec => {
                                                    const isSelected = formData.specialties?.includes(spec);
                                                    return (
                                                        <button
                                                            key={spec}
                                                            onClick={() => {
                                                                const current = formData.specialties || [];
                                                                // Toggle logic
                                                                if (isSelected) {
                                                                    setFormData({ ...formData, specialties: current.filter(t => t !== spec) });
                                                                } else {
                                                                    // Check limit (Max 6)
                                                                    if (current.length < 6) {
                                                                        setFormData({ ...formData, specialties: [...current, spec] });
                                                                    } else {
                                                                        // Optional: Add toast/alert
                                                                        // alert("Máximo 6 especialidades permitidas.");
                                                                    }
                                                                }
                                                            }}
                                                            className={`
                                                                text-sm px-3 py-1.5 rounded-full border transition-all flex items-center gap-1
                                                                ${isSelected
                                                                    ? 'bg-brand-neon-cyan/10 border-brand-neon-cyan text-brand-neon-cyan'
                                                                    : 'bg-transparent border-white/10 text-slate-400 hover:border-white/30 hover:text-slate-200'
                                                                }
                                                            `}
                                                        >
                                                            {isSelected && <Check size={14} />}
                                                            {spec}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                            {availableSpecialties.length === 0 && (
                                                <p className="text-sm text-slate-500 italic">No hay especialidades adicionales.</p>
                                            )}
                                        </div>
                                    );
                                })()}
                            </div>
                        )}
                    </div>
                );
            case 4:
                // New Galería Step
                return (
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-xl font-bold text-white mb-2">Galería del Negocio</h3>
                            <p className="text-slate-400 text-sm mb-6">
                                Sube al menos una foto de portada. Estas imágenes serán lo primero que vean tus clientes.
                            </p>

                            <ImageUploader
                                images={formData.images || []}
                                onImagesChange={(urls) => setFormData({ ...formData, images: urls })}
                                maxImages={5}
                            />
                        </div>
                    </div>
                );
            case 5:
                // Review Step (moved from 4)
                return (
                    <div className="space-y-4 text-sm">
                        <div className="bg-[#151b2e]/50 p-4 rounded-lg border border-white/5">
                            <h3 className="text-white font-bold mb-2">Resumen del Negocio</h3>
                            <div className="grid grid-cols-[100px_1fr] gap-2">
                                <span className="text-slate-500">Nombre:</span>
                                <span className="text-slate-200">{formData.businessName}</span>

                                <span className="text-slate-500">Ubicación:</span>
                                <span className="text-slate-200">{formData.city}, {formData.address || 'N/A'}</span>

                                <span className="text-slate-500">Categoría:</span>
                                <div className="text-slate-200">
                                    <div className="font-medium text-brand-neon-cyan">
                                        {Object.values(TAXONOMY).find(c => c.id === formData.category)?.label.es} principal
                                    </div>
                                    {formData.additionalCategories && formData.additionalCategories.length > 0 && (
                                        <div className="text-xs text-slate-400 mt-1">
                                            + {formData.additionalCategories.map(catId =>
                                                Object.values(TAXONOMY).find(c => c.id === catId)?.label.es
                                            ).join(', ')}
                                        </div>
                                    )}
                                    {formData.subcategory && <div className="text-slate-300 mt-1">↳ Especialidad: {Object.values(TAXONOMY).find(c => c.id === formData.category)?.subcategories.find(s => s.id === formData.subcategory)?.label.es}</div>}
                                </div>

                                <span className="text-slate-500">Detalles:</span>
                                <div className="text-slate-200 flex flex-wrap gap-1">
                                    {formData.specialties?.length ? (
                                        formData.specialties.map(s => (
                                            <span key={s} className="text-xs bg-white/10 px-2 py-0.5 rounded-full">{s}</span>
                                        ))
                                    ) : (
                                        <span className="text-slate-500 italic">Ninguna</span>
                                    )}
                                </div>

                                <span className="text-slate-500">Fotos:</span>
                                <div className="text-slate-200">
                                    {formData.images && formData.images.length > 0 ? (
                                        <div className="flex gap-2 mt-1">
                                            {formData.images.map((img, i) => (
                                                <img key={i} src={img} className="w-10 h-10 rounded object-cover border border-white/10" />
                                            ))}
                                        </div>
                                    ) : <span className="text-red-400">Pendiente</span>}
                                </div>

                                <span className="text-slate-500">Modalidad:</span>
                                <span className="text-slate-200 capitalize">{formData.modality}</span>
                            </div>
                        </div>
                        <p className="text-slate-400 text-center">
                            Al hacer clic en "Crear Negocio", tu perfil será activado como Proveedor y podrás empezar a gestionar tus servicios.
                        </p>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="max-w-xl mx-auto mt-8">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-white mb-1">Configura tu Negocio</h1>
                <p className="text-slate-400 text-sm">Paso {currentStep} de {STEPS.length}</p>
            </div>

            <WizardSteps currentStep={currentStep} steps={STEPS} />

            <GlassPanel className="p-6 md:p-8">
                {renderStepContent()}

                <div className="flex items-center justify-between mt-8 pt-6 border-t border-white/5">
                    {currentStep > 1 ? (
                        <button
                            onClick={handleBack}
                            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
                        >
                            <ArrowLeft size={18} /> Atrás
                        </button>
                    ) : (
                        <button
                            onClick={() => router.push('/')}
                            className="text-slate-500 hover:text-slate-300 text-sm"
                        >
                            Volver al Inicio
                        </button>
                    )}

                    {currentStep < STEPS.length ? (
                        <button
                            onClick={handleNext}
                            disabled={!isStepValid()}
                            className="flex items-center gap-2 bg-brand-neon-cyan/10 text-brand-neon-cyan hover:bg-brand-neon-cyan/20 border border-brand-neon-cyan/50 px-6 py-2 rounded-full font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Siguiente <ArrowRight size={18} />
                        </button>
                    ) : (
                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="flex items-center gap-2 bg-brand-neon-cyan text-black px-8 py-2 rounded-full font-bold hover:shadow-[0_0_20px_rgba(0,240,255,0.4)] transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? 'Creando...' : 'Crear Negocio'}
                        </button>
                    )}
                </div>
            </GlassPanel>
        </div>
    );
}
