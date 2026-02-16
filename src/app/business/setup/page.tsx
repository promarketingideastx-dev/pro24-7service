'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { BusinessProfileService, BusinessProfileData } from '@/services/businessProfile.service';
import WizardSteps from '@/components/business/setup/WizardSteps';
import GlassPanel from '@/components/ui/GlassPanel';
import { Building, MapPin, Tag, Check, ArrowRight, ArrowLeft } from 'lucide-react';
import { TAXONOMY } from '@/lib/taxonomy';
import { useCountry } from '@/context/CountryContext';
import { getCountryConfig } from '@/lib/locations';

const STEPS = [
    { id: 1, title: 'Información', icon: Building },
    { id: 2, title: 'Ubicación', icon: MapPin },
    { id: 3, title: 'Categoría', icon: Tag },
    { id: 4, title: 'Revisión', icon: Check },
];

export default function BusinessSetupPage() {
    const { user, userProfile } = useAuth();
    const { selectedCountry } = useCountry(); // Get global choice
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [formData, setFormData] = useState<Partial<BusinessProfileData>>({
        businessName: '',
        description: '', // Optional Slogan/Desc
        phone: '',
        email: user?.email || '',
        website: '',
        country: userProfile?.country_code || selectedCountry?.code || 'HN',
        city: '',
        department: '', // Added department
        address: '',
        category: '',
        subcategory: '',
        specialties: [],
        modality: 'local', // Default
        images: [] // Placeholder for now
    });

    const handleNext = () => {
        if (currentStep < 4) setCurrentStep(c => c + 1);
    };

    const handleBack = () => {
        if (currentStep > 1) setCurrentStep(c => c - 1);
    };

    const isStepValid = () => {
        if (currentStep === 1) return !!formData.businessName;
        if (currentStep === 2) return !!formData.city && !!formData.department; // Validate Dept + City
        if (currentStep === 3) return !!formData.category;
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
                specialties: formData.specialties || [],
                modality: formData.modality as any || 'local',
                address: formData.address,
                city: formData.city,
                department: formData.department!, // Pass department
                country: formData.country,
                images: [],
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
                            {/* Currently read-only as it follows department */}
                            <input
                                type="text"
                                value={formData.city}
                                readOnly
                                className="w-full h-12 bg-[#151b2e]/50 border border-white/10 rounded-lg px-4 text-slate-300 focus:outline-none cursor-default"
                            />
                            <p className="text-xs text-slate-500 mt-1">La cabecera se selecciona automáticamente según el {currentCountryConfig.regionLabel.toLowerCase()}.</p>
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
                    <div className="space-y-4">
                        <div>
                            <label className="block text-slate-400 text-sm mb-1">Categoría Principal *</label>
                            <select
                                value={formData.category}
                                onChange={e => setFormData({ ...formData, category: e.target.value, subcategory: '', specialties: [] })}
                                className="w-full h-12 bg-[#151b2e] border border-white/10 rounded-lg px-4 text-white focus:outline-none focus:border-brand-neon-cyan"
                            >
                                <option value="">Selecciona una categoría...</option>
                                {Object.values(TAXONOMY).map(cat => (
                                    <option key={cat.id} value={cat.id}>{cat.label.es}</option>
                                ))}
                            </select>
                        </div>
                        {formData.category && (
                            <div>
                                <label className="block text-slate-400 text-sm mb-1">Subcategoría (Opcional)</label>
                                <select
                                    value={formData.subcategory}
                                    onChange={e => setFormData({ ...formData, subcategory: e.target.value, specialties: [] })}
                                    className="w-full h-12 bg-[#151b2e] border border-white/10 rounded-lg px-4 text-white focus:outline-none focus:border-brand-neon-cyan"
                                >
                                    <option value="">Selecciona una subcategoría...</option>
                                    {Object.values(TAXONOMY).find(c => c.id === formData.category)?.subcategories.map(sub => (
                                        <option key={sub.id} value={sub.id}>{sub.label.es}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        <div>
                            <label className="block text-slate-400 text-sm mb-1">Especialidades (Etiquetas)</label>

                            {/* Logic to get available specialties */}
                            {(() => {
                                const categoryData = Object.values(TAXONOMY).find(c => c.id === formData.category);
                                let availableSpecialties: string[] = [];

                                if (categoryData) {
                                    if (formData.subcategory) {
                                        const subData = categoryData.subcategories.find(s => s.id === formData.subcategory);
                                        availableSpecialties = subData?.specialties || [];
                                    } else {
                                        // If no subcategory, get from all subcategories in this category
                                        availableSpecialties = categoryData.subcategories.flatMap(s => s.specialties);
                                        // Unique Only
                                        availableSpecialties = Array.from(new Set(availableSpecialties));
                                    }
                                }

                                return (
                                    <div className="space-y-3">
                                        {/* Chip Display */}
                                        <div className="flex flex-wrap gap-2 min-h-[30px]">
                                            {formData.specialties?.map(tag => (
                                                <span
                                                    key={tag}
                                                    className="bg-brand-neon-cyan/10 border border-brand-neon-cyan/30 text-brand-neon-cyan text-sm px-3 py-1 rounded-full flex items-center gap-2"
                                                >
                                                    {tag}
                                                    <button
                                                        onClick={() => {
                                                            const newTags = formData.specialties?.filter(t => t !== tag) || [];
                                                            setFormData({ ...formData, specialties: newTags });
                                                        }}
                                                        className="hover:text-white transition-colors"
                                                    >
                                                        ×
                                                    </button>
                                                </span>
                                            ))}
                                            {(!formData.specialties || formData.specialties.length === 0) && (
                                                <span className="text-slate-500 text-sm italic py-1">Ninguna seleccionada</span>
                                            )}
                                        </div>

                                        {/* Selector */}
                                        {availableSpecialties.length > 0 ? (
                                            <select
                                                value=""
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    if (val && !formData.specialties?.includes(val)) {
                                                        setFormData({
                                                            ...formData,
                                                            specialties: [...(formData.specialties || []), val]
                                                        });
                                                    }
                                                }}
                                                className="w-full h-12 bg-[#151b2e] border border-white/10 rounded-lg px-4 text-white focus:outline-none focus:border-brand-neon-cyan cursor-pointer"
                                            >
                                                <option value="">+ Agregar especialidad...</option>
                                                {availableSpecialties
                                                    .filter(s => !formData.specialties?.includes(s))
                                                    .sort()
                                                    .map(s => (
                                                        <option key={s} value={s}>{s}</option>
                                                    ))
                                                }
                                            </select>
                                        ) : (
                                            <p className="text-sm text-yellow-500">
                                                No hay especialidades disponibles para esta selección.
                                            </p>
                                        )}
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                );
            case 4:
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
                                <span className="text-slate-200">
                                    {Object.values(TAXONOMY).find(c => c.id === formData.category)?.label.es}
                                    {formData.subcategory && ` > ${formData.subcategory}`}
                                </span>

                                <span className="text-slate-500">Especialidades:</span>
                                <div className="text-slate-200 flex flex-wrap gap-1">
                                    {formData.specialties?.length ? (
                                        formData.specialties.map(s => (
                                            <span key={s} className="text-xs bg-white/10 px-2 py-0.5 rounded-full">{s}</span>
                                        ))
                                    ) : (
                                        <span className="text-slate-500 italic">Ninguna</span>
                                    )}
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
                <p className="text-slate-400 text-sm">Paso {currentStep} de 4</p>
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

                    {currentStep < 4 ? (
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
