'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/context/AuthContext';
import { BusinessProfileService, BusinessProfileData, PortfolioService } from '@/services/businessProfile.service';
import { StorageService } from '@/services/storage.service';
import WizardSteps from '@/components/business/setup/WizardSteps';
import GlassPanel from '@/components/ui/GlassPanel';
import ImageUploader from '@/components/ui/ImageUploader';
import ImageCropModal from '@/components/ui/ImageCropModal';
import {
    Instagram, Facebook, Globe, Upload, X, Trash2, Edit2,
    Building, MapPin, Tag, Check, ArrowRight, ArrowLeft,
    MonitorPlay, Camera, Palette, Music, Scissors, Shield, // Art
    Wrench, Zap, Droplets, PaintBucket, Truck, Key, Car, Bike, Leaf, // General
    Heart, Sparkles, Smile, Footprints // Beauty
} from 'lucide-react';
import { TAXONOMY } from '@/lib/taxonomy';
import { useCountry } from '@/context/CountryContext';
import { getCountryConfig } from '@/lib/locations';
import { ActiveCountry } from '@/lib/activeCountry';
import { toast } from 'sonner';
import PlacesLocationPicker, { LocationResult } from '@/components/business/setup/PlacesLocationPicker';




export default function BusinessSetupPage() {
    const { user, userProfile, loading: authLoading } = useAuth();
    // const { selectedCountry } = useCountry(); // Remove direct context usage if we want strict ActiveCountry
    const t = useTranslations('setup');
    const router = useRouter();
    const STEPS = [
        { id: 1, title: t('stepInfo'), icon: Building },
        { id: 2, title: t('stepLocation'), icon: MapPin },
        { id: 3, title: t('stepCat'), icon: Tag },
        { id: 4, title: t('stepGallery'), icon: Camera },
        { id: 5, title: t('stepReview'), icon: Check },
    ];
    const [currentStep, setCurrentStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [showMultiArea, setShowMultiArea] = useState(false); // Toggle for additional areas

    // Crop Modal State
    const [cropModal, setCropModal] = useState<{
        isOpen: boolean;
        imageSrc: string;
        type: 'cover' | 'logo' | 'gallery';
        galleryId?: string;
    }>({ isOpen: false, imageSrc: '', type: 'cover' });

    // Gallery Items State
    const [galleryItems, setGalleryItems] = useState<Array<{
        id: string;
        url: string;
        title: string;
        description: string;
    }>>([]);

    // Auth guard — redirect unauthenticated users to onboarding
    useEffect(() => {
        if (!authLoading && !user) {
            router.replace('/onboarding');
        }
    }, [user, authLoading]);

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
        lat: undefined,
        lng: undefined,
        placeId: undefined,
        googleMapsUrl: undefined,
        category: '',
        subcategory: '',
        subcategories: [], // New: Multiple subcategories (max 3)
        specialtiesBySubcategory: {}, // New: Maps subcatId -> string[]
        specialties: [],
        additionalCategories: [], // New: Multi-select areas
        additionalSpecialties: [], // New: Multi-select specialties (reserved if needed, but we use 'specialties' for chips)
        modality: 'local',
        images: [],
        coverImage: '',
        logoUrl: '',
        socialMedia: { instagram: '', facebook: '', tiktok: '' }
    });

    const triggerImageSelect = (type: 'cover' | 'logo' | 'gallery', galleryId?: string) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/png, image/jpeg, image/webp';
        input.onchange = (e: any) => {
            const file = e.target.files?.[0];
            if (file) {
                const objectUrl = URL.createObjectURL(file);
                setCropModal({ isOpen: true, imageSrc: objectUrl, type, galleryId });
            }
        };
        input.click();
    };

    const handleCropComplete = async (croppedBlob: Blob) => {
        if (!user) return;
        setIsUploading(true);
        try {
            const file = new File([croppedBlob], `crop_${Date.now()}.jpg`, { type: 'image/jpeg' });
            const url = await StorageService.uploadBusinessImage(user.uid, file);

            if (cropModal.type === 'cover') {
                setFormData(prev => ({ ...prev, coverImage: url }));
            } else if (cropModal.type === 'logo') {
                setFormData(prev => ({ ...prev, logoUrl: url }));
            } else if (cropModal.type === 'gallery') {
                if (cropModal.galleryId) {
                    setGalleryItems(prev => prev.map(item =>
                        item.id === cropModal.galleryId ? { ...item, url } : item
                    ));
                } else {
                    setGalleryItems(prev => [...prev, {
                        id: Date.now().toString(),
                        url,
                        title: '',
                        description: ''
                    }]);
                }
            }
            setCropModal({ isOpen: false, imageSrc: '', type: 'cover' });
        } catch (error) {
            console.error("Error cropping image:", error);
            toast.error("Error al recortar la imagen.");
        } finally {
            setIsUploading(false);
        }
    };

    // Effect: Enforce Active Country alignment on mount
    useEffect(() => {
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
        if (currentStep === 1) return !!formData.businessName && !!formData.coverImage && !!formData.logoUrl;
        if (currentStep === 2) return !!formData.city && !!formData.department && (formData.locationV2?.isConfirmed === true); // Validate strict Location V2
        if (currentStep === 3) {
            return !!formData.category && ((formData.subcategories && formData.subcategories.length > 0) || !!formData.subcategory);
        }
        if (currentStep === 4) return true; // Gallery is optional now
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
                subcategory: formData.subcategories?.[0] || formData.subcategory || '',
                subcategories: formData.subcategories || [],
                specialtiesBySubcategory: formData.specialtiesBySubcategory || {},
                // Flatten specialties from specialtiesBySubcategory map for legacy queries
                additionalSpecialties: Object.values(formData.specialtiesBySubcategory || {}).flat(),
                specialties: Object.values(formData.specialtiesBySubcategory || {}).flat(),
                additionalCategories: formData.additionalCategories || [],
                modality: formData.modality as any || 'local',
                address: formData.address,
                city: formData.city,
                department: formData.department!, // Pass department
                country: formData.country,
                // Exact GPS coordinates from Google Places picker
                lat: formData.lat,
                lng: formData.lng,
                placeId: formData.placeId,
                googleMapsUrl: formData.googleMapsUrl,
                locationV2: formData.locationV2,
                coverImage: formData.coverImage,
                images: galleryItems.map(item => item.url) || [], // Sync URLs
                logoUrl: formData.logoUrl,
                userId: user.uid,
                email: formData.email!,
                phone: formData.phone,
                socialMedia: (formData as any).socialMedia || { instagram: '', facebook: '', tiktok: '' }
            };

            await BusinessProfileService.createProfile(user.uid, payload);

            // Inject gallery items as portfolio posts sequentially
            if (galleryItems.length > 0) {
                for (const item of galleryItems) {
                    await PortfolioService.addPortfolioItem(user.uid, {
                        url: item.url,
                        title: item.title,
                        description: item.description
                    });
                }
            }

            // Redirect to dashboard
            router.push('/business/dashboard');
        } catch (error: any) {
            console.error("Setup Error:", error);
            toast.error(`Error al crear negocio: ${error.message}`);
            setIsSubmitting(false);
        }
    };

    // Render Steps
    const renderStepContent = () => {
        switch (currentStep) {
            case 1:
                return (
                    <div className="space-y-4">
                        {/* Imágenes de Perfil */}
                        <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-5 mb-8">
                            <h3 className="text-slate-900 font-bold mb-2 flex items-center gap-2"><Camera size={18} className="text-teal-600" /> {t('profileImages')}</h3>

                            <div>
                                <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">{t('coverImage')} *</label>

                                <div
                                    onClick={() => triggerImageSelect('cover')}
                                    className={`relative w-full aspect-[3/1] rounded-2xl border-2 border-dashed flex flex-col items-center justify-center overflow-hidden cursor-pointer transition-all group ${formData.coverImage ? 'border-teal-500/50' : 'border-slate-300 hover:border-teal-400 hover:bg-slate-50'}`}
                                >
                                    {formData.coverImage ? (
                                        <>
                                            <img src={formData.coverImage} alt="Cover" className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                                <div className="flex items-center gap-2 text-white bg-black/60 px-4 py-2 rounded-full font-medium text-sm">
                                                    <Edit2 size={16} /> {t('imageUploader.tapToChange')}
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="text-center p-4">
                                            <div className="bg-teal-50 text-teal-600 p-3 rounded-full inline-block mb-2">
                                                <Upload size={24} />
                                            </div>
                                            <p className="text-sm font-medium text-slate-600">{t('imageUploader.uploadGallery')}</p>
                                        </div>
                                    )}
                                </div>
                                <p className="text-slate-500 text-xs mt-2">{t('coverHint')}</p>
                            </div>

                            <div className="h-px w-full bg-slate-200 my-4" />

                            <div>
                                <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">{t('logoImage')} *</label>
                                <div
                                    onClick={() => triggerImageSelect('logo')}
                                    className={`relative w-32 h-32 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center overflow-hidden cursor-pointer transition-all group ${formData.logoUrl ? 'border-teal-500/50' : 'border-slate-300 hover:border-teal-400 hover:bg-slate-50'}`}
                                >
                                    {formData.logoUrl ? (
                                        <>
                                            <img src={formData.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                                <div className="text-white bg-black/60 p-2 rounded-full font-medium">
                                                    <Edit2 size={16} />
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="text-center p-2">
                                            <div className="bg-purple-50 text-purple-600 p-2 rounded-full inline-block mb-1">
                                                <Upload size={20} />
                                            </div>
                                            <p className="text-xs font-medium text-slate-600 text-center uppercase">LOGO</p>
                                        </div>
                                    )}
                                </div>
                                <p className="text-slate-500 text-xs mt-2">{t('logoHint')}</p>
                            </div>
                        </div>

                        <div>
                            <label className="block text-slate-600 text-sm mb-1">{t('businessName')}</label>
                            <input
                                type="text"
                                value={formData.businessName}
                                onChange={e => setFormData({ ...formData, businessName: e.target.value })}
                                className="w-full h-12 bg-white border border-slate-200 rounded-lg px-4 text-slate-900 focus:outline-none focus:border-teal-500"
                                placeholder="Ej: Mi Negocio Profesional"
                            />
                        </div>
                        <div>
                            <label className="block text-slate-600 text-sm mb-1">Eslogan o Descripción Corta</label>
                            <textarea
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                className="w-full h-24 bg-white border border-slate-200 rounded-lg px-4 py-2 text-slate-900 focus:outline-none focus:border-teal-500 resize-none"
                                placeholder="Ej: Soluciones profesionales para ti."
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-slate-600 text-sm mb-1">Teléfono</label>
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                    className="w-full h-12 bg-white border border-slate-200 rounded-lg px-4 text-slate-900 focus:outline-none focus:border-teal-500"
                                    placeholder={`${getCountryConfig((formData.country as any) || 'HN').phonePrefix} 0000-0000`}
                                />
                            </div>
                            <div>
                                <label className="block text-slate-600 text-sm mb-1">Sitio Web (Opcional)</label>
                                <input
                                    type="url"
                                    value={formData.website}
                                    onChange={e => setFormData({ ...formData, website: e.target.value })}
                                    className="w-full h-12 bg-white border border-slate-200 rounded-lg px-4 text-slate-900 focus:outline-none focus:border-teal-500"
                                    placeholder="https://..."
                                />
                            </div>
                        </div>

                        {/* Redes Sociales */}
                        <div>
                            <label className="block text-slate-600 text-sm mb-3">
                                Redes Sociales <span className="text-slate-600">(Opcional)</span>
                            </label>
                            <div className="space-y-2">

                                {/* Instagram */}
                                <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-3 h-14 focus-within:border-pink-500/60 focus-within:bg-pink-500/5 transition-all group">
                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shrink-0">
                                        <Instagram size={16} className="text-white" />
                                    </div>
                                    <div className="flex items-center flex-1 min-w-0">
                                        <span className="text-slate-500 text-sm mr-1 shrink-0">@</span>
                                        <input
                                            type="text"
                                            value={(formData as any).socialMedia?.instagram || ''}
                                            onChange={e => setFormData({ ...formData, socialMedia: { ...(formData as any).socialMedia, instagram: e.target.value } } as any)}
                                            placeholder="tu_negocio"
                                            className="flex-1 bg-transparent text-slate-900 text-sm focus:outline-none placeholder:text-slate-600"
                                        />
                                    </div>
                                    <span className="text-xs text-slate-600 shrink-0 hidden group-focus-within:text-pink-400 group-focus-within:block">Instagram</span>
                                </div>

                                {/* Facebook */}
                                <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-3 h-14 focus-within:border-blue-500/60 focus-within:bg-blue-500/5 transition-all group">
                                    <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
                                        <Facebook size={16} className="text-white" />
                                    </div>
                                    <div className="flex items-center flex-1 min-w-0">
                                        <span className="text-slate-600 text-xs mr-1 shrink-0">fb.com/</span>
                                        <input
                                            type="text"
                                            value={(formData as any).socialMedia?.facebook || ''}
                                            onChange={e => setFormData({ ...formData, socialMedia: { ...(formData as any).socialMedia, facebook: e.target.value } } as any)}
                                            placeholder="tu.negocio"
                                            className="flex-1 bg-transparent text-slate-900 text-sm focus:outline-none placeholder:text-slate-600"
                                        />
                                    </div>
                                </div>

                                {/* TikTok */}
                                <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-3 h-14 focus-within:border-slate-400/60 focus-within:bg-slate-50 transition-all group">
                                    <div className="w-8 h-8 rounded-lg bg-[#111] border border-slate-200 flex items-center justify-center shrink-0">
                                        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.17 8.17 0 0 0 4.78 1.53V6.79a4.85 4.85 0 0 1-1.01-.1z" /></svg>
                                    </div>
                                    <div className="flex items-center flex-1 min-w-0">
                                        <span className="text-slate-500 text-sm mr-1 shrink-0">@</span>
                                        <input
                                            type="text"
                                            value={(formData as any).socialMedia?.tiktok || ''}
                                            onChange={e => setFormData({ ...formData, socialMedia: { ...(formData as any).socialMedia, tiktok: e.target.value } } as any)}
                                            placeholder="tu_negocio"
                                            className="flex-1 bg-transparent text-slate-900 text-sm focus:outline-none placeholder:text-slate-600"
                                        />
                                    </div>
                                </div>

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
                                <label className="block text-slate-700 font-medium text-sm mb-1">País</label>
                                <div className="w-full h-12 bg-slate-50 border border-slate-200 rounded-lg px-4 flex items-center text-slate-700 font-medium cursor-not-allowed">
                                    {currentCountryConfig.name} ({currentCountryConfig.code})
                                </div>
                            </div>
                            <div>
                                <label className="block text-slate-700 font-medium text-sm mb-1">{currentCountryConfig.regionLabel} *</label>
                                <select
                                    value={formData.department || ''}
                                    onChange={e => {
                                        const selectedRegion = regions.find(l => l.name === e.target.value);
                                        setFormData({
                                            ...formData,
                                            department: e.target.value,
                                            // Auto-capital logic is valid for HN, can be adjusted for others later
                                            city: selectedRegion?.cities?.[0] || '',
                                            // [FIX] Limpiar coords al cambiar departamento para forzar re-centrado del mapa a la cabecera
                                            lat: undefined,
                                            lng: undefined,
                                            address: '',
                                            // [FIX] Destruir por completo la memoria de las viejas coordenadas en V2
                                            locationV2: formData.locationV2 ? {
                                                ...formData.locationV2,
                                                isConfirmed: false,
                                                lat: undefined as any,
                                                lng: undefined as any,
                                                address: ''
                                            } : undefined
                                        });
                                    }}
                                    className="w-full h-12 bg-white border border-slate-200 rounded-lg px-4 text-slate-900 focus:outline-none focus:border-teal-500"
                                >
                                    <option value="">Selecciona...</option>
                                    {regions.map(reg => (
                                        <option key={reg.name} value={reg.name}>{reg.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-slate-600 text-sm mb-1">Ciudad / Cabecera *</label>
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
                                                ? 'bg-slate-50 border border-slate-200 text-slate-600 cursor-not-allowed'
                                                : 'bg-white border border-slate-200 text-slate-900 focus:border-teal-500'
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

                        {/* Google Places Location Picker */}
                        <div>
                            <label className="block text-slate-600 text-sm mb-2">
                                Dirección Exacta
                                {formData.lat && (
                                    <span className="ml-2 text-xs text-green-400 font-medium">✓ Ubicación guardada</span>
                                )}
                            </label>
                            <PlacesLocationPicker
                                onLocationSelect={(result: LocationResult) => {
                                    setFormData(prev => ({
                                        ...prev,
                                        address: prev.address || result.formattedAddress, // [FIX] Evitar pisotear la dirección manual si ya existe
                                        lat: result.lat,
                                        lng: result.lng,
                                        placeId: result.placeId,
                                        googleMapsUrl: result.googleMapsUrl,
                                        // Auto-fill city/department if not already set
                                        city: prev.city || result.city || prev.city,
                                        department: prev.department || result.department || prev.department,
                                        locationV2: {
                                            country: result.country || prev.country || '',
                                            department: result.department || prev.department || '',
                                            city: result.city || prev.city || '',
                                            address: prev.address || result.formattedAddress, // [FIX] Mantener sincronizada la dirección en V2
                                            lat: result.lat,
                                            lng: result.lng,
                                            placeId: result.placeId,
                                            googleMapsUrl: result.googleMapsUrl,
                                            source: result.source,
                                            isConfirmed: result.isConfirmed,
                                            updatedAt: new Date()
                                        }
                                    }));
                                }}
                                initialAddress={formData.address}
                                initialLat={formData.lat}
                                initialLng={formData.lng}
                                countryCode={(() => {
                                    const codeMap: Record<string, string> = {
                                        'Honduras': 'HN', 'México': 'MX', 'Mexico': 'MX',
                                        'Guatemala': 'GT', 'El Salvador': 'SV', 'Nicaragua': 'NI',
                                        'Costa Rica': 'CR', 'Panamá': 'PA', 'Panama': 'PA',
                                        'Colombia': 'CO', 'Venezuela': 'VE', 'Perú': 'PE', 'Peru': 'PE',
                                        'Brasil': 'BR', 'Brazil': 'BR', 'Argentina': 'AR', 'Chile': 'CL',
                                        'España': 'ES', 'Spain': 'ES', 'Estados Unidos': 'US', 'United States': 'US'
                                    };
                                    return codeMap[formData.country as string] || 'HN';
                                })()}
                                cityContext={formData.city && formData.department ? `${formData.city}, ${formData.department}` : undefined}
                            />
                        </div>

                        <div>
                            <label className="block text-slate-600 text-sm mb-1">Modalidad</label>
                            <div className="grid grid-cols-3 gap-2">
                                {['local', 'home', 'both'].map((m) => (
                                    <button
                                        key={m}
                                        onClick={() => setFormData({ ...formData, modality: m as any })}
                                        className={`h-10 rounded border text-sm font-medium transition-colors
                                            ${formData.modality === m
                                                ? 'bg-teal-500/20 border-teal-500 text-white'
                                                : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
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
                                <label className="block text-slate-600 text-sm">¿En qué área trabajas? *</label>
                                <button
                                    onClick={() => setShowMultiArea(!showMultiArea)}
                                    className={`text-xs px-2 py-1 rounded border transition-colors ${showMultiArea ? 'bg-teal-500/10 border-teal-500 text-teal-600' : 'border-slate-200 text-slate-500'}`}
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
                                                            toast.error("Máximo 2 áreas adicionales permitidas.");
                                                        }
                                                    }
                                                } else {
                                                    // Single Select Logic (Standard)
                                                    setFormData({
                                                        ...formData,
                                                        category: cat.id,
                                                        subcategory: '',
                                                        subcategories: [],
                                                        specialtiesBySubcategory: {},
                                                        specialties: [],
                                                        additionalCategories: [], // Reset additional if executing primary switch in single mode
                                                        additionalSpecialties: []
                                                    });
                                                }
                                            }}
                                            className={`
                                                flex flex-col items-center justify-center p-4 rounded-xl border transition-all duration-200 relative
                                                ${isPrimary
                                                    ? 'bg-teal-500/10 border-teal-500 text-slate-900 shadow-[0_0_15px_rgba(0,240,255,0.15)] ring-1 ring-brand-neon-cyan'
                                                    : isAdditional
                                                        ? 'bg-teal-500/5 border-teal-500/50 text-slate-700'
                                                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-[#1a233b]'
                                                }
                                            `}
                                        >
                                            {isPrimary && <div className="absolute top-2 right-2 text-xs bg-teal-500 text-black px-1.5 rounded font-bold">Principal</div>}
                                            {isAdditional && <div className="absolute top-2 right-2 text-xs bg-slate-100 text-slate-500 px-1.5 rounded">Adicional</div>}

                                            <Icon size={32} className={`mb-3 ${isSelected ? 'text-teal-600' : 'text-slate-500'}`} />
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
                                            <span key={catId} className="bg-slate-50 border border-slate-200 text-slate-500 text-xs px-2 py-1 rounded-full flex items-center gap-1">
                                                {catLabel}
                                                <button onClick={() => setFormData({
                                                    ...formData,
                                                    additionalCategories: formData.additionalCategories?.filter(id => id !== catId)
                                                })} className="hover:text-slate-800">×</button>
                                            </span>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* 2. Subcategoría (Pills / Cards) - Only for Primary Category */}
                        {formData.category && (
                            <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                                <label className="block text-slate-600 text-sm mb-3">Selecciona tus especialidades principales (Máximo 3):</label>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {Object.values(TAXONOMY).find(c => c.id === formData.category)?.subcategories.map(sub => {
                                        const isSelected = formData.subcategories?.includes(sub.id);
                                        // Simple Icon Logic based on ID keywords or generic
                                        let SubIcon = Tag;
                                        if (['photography', 'camera'].some(k => sub.id.includes(k))) SubIcon = Camera;
                                        if (sub.id === 'videography') SubIcon = MonitorPlay;
                                        if (sub.id === 'music') SubIcon = Music;
                                        if (sub.id === 'hair') SubIcon = Sparkles; // Generic Replacement
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
                                                onClick={() => {
                                                    const currentSubs = formData.subcategories || [];
                                                    if (isSelected) {
                                                        const newSubs = currentSubs.filter(id => id !== sub.id);
                                                        const newMap = { ...(formData.specialtiesBySubcategory || {}) };
                                                        delete newMap[sub.id]; // Remove specialties for deselected subcat
                                                        setFormData({
                                                            ...formData,
                                                            subcategories: newSubs,
                                                            specialtiesBySubcategory: newMap
                                                        });
                                                    } else {
                                                        if (currentSubs.length < 3) {
                                                            setFormData({
                                                                ...formData,
                                                                subcategories: [...currentSubs, sub.id]
                                                            });
                                                        } else {
                                                            toast.error("Máximo 3 especialidades principales permitidas.");
                                                        }
                                                    }
                                                }}
                                                className={`
                                                    flex items-center gap-3 p-3 rounded-lg border text-left transition-all
                                                    ${isSelected
                                                        ? 'bg-teal-500/20 border-teal-500 text-white'
                                                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-700'
                                                    }
                                                `}
                                            >
                                                <div className={`p-2 rounded-full ${isSelected ? 'bg-teal-500/20' : 'bg-slate-50'}`}>
                                                    <SubIcon size={18} className={isSelected ? 'text-teal-600' : 'text-slate-500'} />
                                                </div>
                                                <span className="text-sm font-medium leading-tight">{sub.label.es}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* 3. Especialidades (Chips) - Multi-select */}
                        {formData.subcategories && formData.subcategories.length > 0 && (
                            <div className="animate-in fade-in slide-in-from-top-4 duration-300 space-y-4 pt-2">
                                {formData.subcategories.map(subId => {
                                    const categoryData = Object.values(TAXONOMY).find(c => c.id === formData.category);
                                    const subData = categoryData?.subcategories.find(s => s.id === subId);
                                    if (!subData) return null;

                                    const availableSpecialties = (subData?.specialties || []).map(s =>
                                        typeof s === 'string' ? { es: s, en: s, pt: s } : s as any
                                    );

                                    return (
                                        <div key={subId}>
                                            <label className="block text-slate-600 text-sm mb-2">Detalles para {subData.label.es} (Opcional):</label>
                                            <div className="bg-white/30 border border-slate-200 rounded-xl p-4">
                                                <div className="flex flex-wrap gap-2">
                                                    {availableSpecialties.map(spec => {
                                                        const specKey = spec.es;
                                                        const currentSpecs = formData.specialtiesBySubcategory?.[subId] || [];
                                                        const isSelected = currentSpecs.includes(specKey);
                                                        return (
                                                            <button
                                                                key={specKey}
                                                                onClick={() => {
                                                                    if (isSelected) {
                                                                        setFormData({
                                                                            ...formData,
                                                                            specialtiesBySubcategory: {
                                                                                ...(formData.specialtiesBySubcategory || {}),
                                                                                [subId]: currentSpecs.filter(t => t !== specKey)
                                                                            }
                                                                        });
                                                                    } else {
                                                                        setFormData({
                                                                            ...formData,
                                                                            specialtiesBySubcategory: {
                                                                                ...(formData.specialtiesBySubcategory || {}),
                                                                                [subId]: [...currentSpecs, specKey]
                                                                            }
                                                                        });
                                                                    }
                                                                }}
                                                                className={`
                                                                    text-sm px-3 py-1.5 rounded-full border transition-all flex items-center gap-1
                                                                    ${isSelected
                                                                        ? 'bg-teal-500/10 border-teal-500 text-teal-600'
                                                                        : 'bg-transparent border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-700'
                                                                    }
                                                                `}
                                                            >
                                                                {isSelected && <Check size={14} />}
                                                                {specKey}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                                {availableSpecialties.length === 0 && (
                                                    <p className="text-sm text-slate-400 italic">No hay especialidades adicionales.</p>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                );
            case 4:
                return (
                    <div className="space-y-6">
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <h3 className="text-slate-900 font-bold">{t('galleryTitle')}</h3>
                                <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-md">{galleryItems.length} / 5</span>
                            </div>
                            <p className="text-slate-600 text-sm mb-6">
                                {t('gallerySubtitle')}
                            </p>

                            <div className="space-y-4 max-w-2xl">
                                {galleryItems.map((item, index) => (
                                    <div key={item.id} className="bg-white border border-slate-200 rounded-2xl p-4 flex gap-4 md:gap-6 shadow-sm hover:shadow-md transition-shadow relative group animate-in fade-in zoom-in-95 duration-300">
                                        <button
                                            onClick={() => setGalleryItems(prev => prev.filter(i => i.id !== item.id))}
                                            className="absolute -top-2 -right-2 bg-red-100 text-red-500 hover:bg-red-500 hover:text-white p-1.5 rounded-full transition-colors z-10 shadow-sm"
                                            title="Eliminar imagen"
                                        >
                                            <X size={16} />
                                        </button>

                                        <div
                                            onClick={() => triggerImageSelect('gallery', item.id)}
                                            className="w-24 h-24 md:w-32 md:h-32 rounded-xl overflow-hidden shrink-0 cursor-pointer relative group/image border border-slate-200 bg-slate-50"
                                        >
                                            <img src={item.url} alt={`Gallery ${index}`} className="w-full h-full object-cover group-hover/image:scale-105 transition-transform" />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/image:opacity-100 flex items-center justify-center transition-opacity">
                                                <Edit2 size={20} className="text-white drop-shadow-md" />
                                            </div>
                                        </div>

                                        <div className="flex-1 space-y-3">
                                            <div>
                                                <input
                                                    type="text"
                                                    value={item.title}
                                                    onChange={(e) => setGalleryItems(prev => prev.map(i => i.id === item.id ? { ...i, title: e.target.value } : i))}
                                                    placeholder={t('imageUploader.titleOptional')}
                                                    className="w-full border-b border-slate-200 pb-1 text-slate-900 font-bold placeholder:font-normal focus:outline-none focus:border-teal-500"
                                                />
                                            </div>
                                            <div>
                                                <textarea
                                                    value={item.description}
                                                    onChange={(e) => {
                                                        const words = e.target.value.trim().split(/\s+/).filter(w => w.length > 0);
                                                        if (words.length <= 150) {
                                                            setGalleryItems(prev => prev.map(i => i.id === item.id ? { ...i, description: e.target.value } : i));
                                                        }
                                                    }}
                                                    placeholder={t('imageUploader.descOptional')}
                                                    className="w-full h-16 md:h-20 text-sm !border-b !border-slate-200 !rounded-none pb-1 text-slate-600 focus:outline-none focus:border-teal-500 resize-none"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {galleryItems.length < 5 && (
                                    <button
                                        onClick={() => triggerImageSelect('gallery')}
                                        className="w-full py-6 border-2 border-dashed border-slate-300 hover:border-teal-500 rounded-2xl flex flex-col items-center justify-center gap-2 text-slate-500 hover:text-teal-600 hover:bg-teal-50/50 transition-colors"
                                    >
                                        <div className="bg-slate-100 p-3 rounded-full group-hover:bg-teal-100 transition-colors">
                                            <Upload size={24} />
                                        </div>
                                        <span className="font-medium text-sm">{t('imageUploader.addPhoto')}</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                );
            case 5:
                // Review Step (moved from 4)
                return (
                    <div className="space-y-4 text-sm">
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                            <h3 className="text-slate-900 font-bold mb-2">Resumen del Negocio</h3>
                            <div className="grid grid-cols-[100px_1fr] gap-2">
                                <span className="text-slate-500">Nombre:</span>
                                <span className="text-slate-700">{formData.businessName}</span>

                                <span className="text-slate-500">Ubicación:</span>
                                <span className="text-slate-700">{formData.city}, {formData.address || 'N/A'}</span>

                                <span className="text-slate-500">Categoría:</span>
                                <div className="text-slate-700">
                                    <div className="font-medium text-teal-600">
                                        {Object.values(TAXONOMY).find(c => c.id === formData.category)?.label.es} principal
                                    </div>
                                    {formData.additionalCategories && formData.additionalCategories.length > 0 && (
                                        <div className="text-xs text-slate-600 mt-1">
                                            + {formData.additionalCategories.map(catId =>
                                                Object.values(TAXONOMY).find(c => c.id === catId)?.label.es
                                            ).join(', ')}
                                        </div>
                                    )}
                                    {formData.subcategory && <div className="text-slate-500 mt-1">↳ Especialidad: {Object.values(TAXONOMY).find(c => c.id === formData.category)?.subcategories.find(s => s.id === formData.subcategory)?.label.es}</div>}
                                </div>

                                <span className="text-slate-500">Detalles:</span>
                                <div className="text-slate-700 flex flex-wrap gap-1">
                                    {formData.specialties?.length ? (
                                        formData.specialties.map(s => (
                                            <span key={s} className="text-xs bg-slate-100 px-2 py-0.5 rounded-full">{s}</span>
                                        ))
                                    ) : (
                                        <span className="text-slate-400 italic">Ninguna</span>
                                    )}
                                </div>

                                <span className="text-slate-500">Fotos:</span>
                                <div className="text-slate-700">
                                    {formData.images && formData.images.length > 0 ? (
                                        <div className="flex gap-2 mt-1">
                                            {formData.images.map((img, i) => (
                                                <img key={i} src={img} className="w-10 h-10 rounded object-cover border border-slate-200" />
                                            ))}
                                        </div>
                                    ) : <span className="text-red-400">Pendiente</span>}
                                </div>

                                <span className="text-slate-500">Modalidad:</span>
                                <span className="text-slate-700 capitalize">{formData.modality}</span>
                            </div>
                        </div>
                        <p className="text-slate-600 text-center">
                            Al hacer clic en {t("createBusiness")}, tu perfil será activado como Proveedor y podrás empezar a gestionar tus servicios.
                        </p>
                    </div>
                );
            default:
                return null;
        }
    };

    const progressPercent = Math.round(((currentStep - 1) / (STEPS.length - 1)) * 100);

    return (
        <div className="min-h-screen bg-[#F4F6F8] flex items-center justify-center p-4 md:p-8">

            {/* Global Image Crop Modal for Setup */}
            {cropModal.isOpen && (
                <div className="fixed inset-0 z-[9999]">
                    <ImageCropModal
                        imageSrc={cropModal.imageSrc}
                        aspectRatio={cropModal.type === 'cover' ? 3 / 1 : cropModal.type === 'logo' ? 1 : 1}
                        freeCrop={cropModal.type === 'gallery'}
                        onComplete={handleCropComplete}
                        onClose={() => setCropModal({ isOpen: false, imageSrc: '', type: 'cover' })}
                    />
                </div>
            )}

            {/* Global Uploading Overlay */}
            {isUploading && (
                <div className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center text-white">
                    <div className="w-12 h-12 border-4 border-white/20 border-t-teal-400 rounded-full animate-spin mb-4" />
                    <p className="font-bold tracking-wide">Procesando imagen...</p>
                </div>
            )}

            <div className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row border border-slate-200 min-h-[600px]">

                {/* ── LEFT SIDEBAR ── */}
                <div className="w-full md:w-72 bg-slate-50 border-b md:border-b-0 md:border-r border-slate-200 flex flex-col p-6 shrink-0">
                    {/* Logo / Header */}
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center">
                            <Building size={20} className="text-teal-600" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 uppercase tracking-wider">PRO24/7</p>
                            <p className="text-sm font-bold text-slate-900">Registro de Negocio</p>
                        </div>
                    </div>

                    {/* Step List */}
                    <nav className="flex-1 space-y-1">
                        {STEPS.map((step, idx) => {
                            const stepNum = idx + 1;
                            const isDone = stepNum < currentStep;
                            const isActive = stepNum === currentStep;
                            const isPending = stepNum > currentStep;

                            return (
                                <div key={step.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${isActive ? 'bg-teal-50' : ''}`}>
                                    {/* Step indicator */}
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold transition-all
                                        ${isDone ? 'bg-green-500 text-white' : isActive ? 'bg-teal-500 text-white shadow-sm' : 'bg-white text-slate-400 border border-slate-200'}`}>
                                        {isDone ? <Check size={12} /> : stepNum}
                                    </div>
                                    <span className={`text-sm font-medium transition-colors ${isActive ? 'text-teal-700 font-bold' : isDone ? 'text-green-600' : 'text-slate-500'}`}>
                                        {stepNum}. {step.title}
                                    </span>
                                    {isDone && <Check size={14} className="text-green-500 ml-auto shrink-0" />}
                                </div>
                            );
                        })}
                    </nav>

                    {/* Progress bar */}
                    <div className="mt-6 pt-4 border-t border-slate-200">
                        <div className="flex justify-between text-xs text-slate-500 mb-2">
                            <span>Progreso</span>
                            <span>{progressPercent}%</span>
                        </div>
                        <div className="h-1.5 bg-slate-50 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-teal-400 to-blue-500 rounded-full transition-all duration-500"
                                style={{ width: `${progressPercent}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* ── RIGHT CONTENT ── */}
                <div className="flex-1 flex flex-col min-h-0">
                    {/* Scrollable content */}
                    <div className="flex-1 overflow-y-auto p-6 md:p-10">
                        {renderStepContent()}
                    </div>

                    {/* Footer Navigation */}
                    <div className="shrink-0 border-t border-slate-200 px-6 md:px-10 py-5 flex items-center justify-between bg-white">
                        {currentStep > 1 ? (
                            <button
                                onClick={handleBack}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-800 hover:border-slate-300 transition-all text-sm font-medium"
                            >
                                <ArrowLeft size={16} /> Atrás
                            </button>
                        ) : (
                            <button
                                onClick={() => router.push('/')}
                                className="text-slate-500 hover:text-slate-500 text-sm transition-colors"
                            >
                                Volver al Inicio
                            </button>
                        )}

                        {currentStep < STEPS.length ? (
                            <button
                                onClick={handleNext}
                                disabled={!isStepValid()}
                                className="flex items-center gap-2 bg-teal-500 hover:bg-teal-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-teal-500/20 hover:shadow-lg shadow-teal-500/30"
                            >
                                Continuar <ArrowRight size={16} />
                            </button>
                        ) : (
                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="flex items-center gap-2 bg-teal-500 hover:bg-teal-600 text-white px-8 py-2.5 rounded-xl font-bold text-sm transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-md shadow-teal-500/30"
                            >
                                {isSubmitting ? (
                                    <><div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" /> Creando...</>
                                ) : (
                                    <><Check size={16} /> Crear Negocio</>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
