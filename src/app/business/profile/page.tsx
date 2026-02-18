'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { BusinessProfileService, BusinessProfileData } from '@/services/businessProfile.service';
import GlassPanel from '@/components/ui/GlassPanel';
import ImageUploader from '@/components/ui/ImageUploader';
import { TAXONOMY } from '@/lib/taxonomy';
import {
    Save, Building, MapPin, Tag, Camera, ArrowLeft, Check,
    Palette, Wrench, Sparkles, MonitorPlay, Music, Scissors, Shield,
    Zap, Droplets, PaintBucket, Truck, Key, Car, Bike, Leaf, Clock
} from 'lucide-react';
import WeeklyScheduleEditor from '@/components/business/WeeklyScheduleEditor';
import { WeeklySchedule } from '@/services/employee.service';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export default function BusinessProfilePage() {
    const { user, userProfile } = useAuth(); // Assuming userProfile has businessProfileId
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [formData, setFormData] = useState<Partial<BusinessProfileData>>({});
    const [showMultiArea, setShowMultiArea] = useState(false);

    // Schedule API
    const [scheduleOpen, setScheduleOpen] = useState(false);

    const handleSaveSchedule = async (schedule: WeeklySchedule) => {
        setFormData(prev => ({ ...prev, openingHours: schedule }));
        setScheduleOpen(false);
        // Optional: auto-save profile here too? Or wait for big save button?
        // Let's wait for big save button to be consistent, but update local state so UI shows "Configurado"
        toast.success("Horario actualizado en el formulario. No olvides guardar cambios.");
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

                const profileDoc = await BusinessProfileService.getProfile(user.uid); // Need to implement this or use existing pattern
                if (profileDoc) {
                    setFormData(profileDoc);
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
            await BusinessProfileService.updateProfile(user.uid, formData);
            toast.success("Perfil actualizado correctamente");
        } catch (error) {
            console.error("Error updating", error);
            toast.error("Error al actualizar perfil");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-12 text-center text-white">Cargando perfil...</div>;

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div className="flex items-center gap-4 mb-6">
                <button onClick={() => router.back()} className="p-2 hover:bg-white/5 rounded-full text-slate-400 hover:text-white transition-colors">
                    <ArrowLeft size={24} />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-white">Editar Perfil de Negocio</h1>
                    <p className="text-slate-400 text-sm">Actualiza tu información pública y fotos</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left Column: Navigation / Summary (Optional, keeping simple for now) */}
                <div className="md:col-span-2 space-y-6">

                    {/* Basic Info */}
                    <GlassPanel className="p-6">
                        <div className="flex items-center gap-2 mb-4 text-brand-neon-cyan">
                            <Building size={20} />
                            <h2 className="font-bold text-white">Información Básica</h2>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-slate-400 text-xs uppercase mb-1">Nombre del Negocio</label>
                                <input
                                    type="text"
                                    value={formData.businessName || ''}
                                    onChange={e => setFormData({ ...formData, businessName: e.target.value })}
                                    className="w-full bg-[#0B0F19] border border-white/10 rounded-lg px-4 py-2 text-white focus:border-brand-neon-cyan focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-slate-400 text-xs uppercase mb-1">Descripción</label>
                                <textarea
                                    value={formData.description || ''}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full bg-[#0B0F19] border border-white/10 rounded-lg px-4 py-2 text-white focus:border-brand-neon-cyan focus:outline-none h-24 resize-none"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-slate-400 text-xs uppercase mb-1">Teléfono</label>
                                    <input
                                        type="tel"
                                        value={formData.phone || ''}
                                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                        className="w-full bg-[#0B0F19] border border-white/10 rounded-lg px-4 py-2 text-white focus:border-brand-neon-cyan focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-slate-400 text-xs uppercase mb-1">Sitio Web</label>
                                    <input
                                        type="url"
                                        value={formData.website || ''}
                                        onChange={e => setFormData({ ...formData, website: e.target.value })}
                                        className="w-full bg-[#0B0F19] border border-white/10 rounded-lg px-4 py-2 text-white focus:border-brand-neon-cyan focus:outline-none"
                                    />
                                </div>
                            </div>
                        </div>
                    </GlassPanel>

                    {/* Gallery - This is what the user wants! */}
                    <GlassPanel className="p-6">
                        <div className="flex items-center gap-2 mb-4 text-brand-neon-cyan">
                            <Camera size={20} />
                            <h2 className="font-bold text-white">Galería de Fotos</h2>
                        </div>
                        <p className="text-slate-400 text-sm mb-4">Sube fotos de tus mejores trabajos. La primera será tu portada.</p>

                        <ImageUploader
                            images={formData.images || []}
                            onImagesChange={urls => setFormData({ ...formData, images: urls })}
                            maxImages={5}
                        />
                    </GlassPanel>

                    {/* Opening Hours Section */}
                    <GlassPanel className="p-6">
                        <div className="flex items-center gap-2 mb-4 text-brand-neon-cyan">
                            <Clock size={20} />
                            <h2 className="font-bold text-white">Horario de Apertura</h2>
                        </div>
                        <p className="text-slate-400 text-sm mb-4">
                            Define el horario general de tu negocio. Esto servirá como base para la agenda.
                        </p>
                        <div className="flex items-center justify-between bg-[#0B0F19] p-4 rounded-lg border border-white/5">
                            <div>
                                <span className="block text-white font-medium mb-1">
                                    {formData.openingHours ? "Horario Definido" : "Horario no configurado"}
                                </span>
                                <span className="text-xs text-slate-500">
                                    {formData.openingHours ? "Tu horario general está activo." : "Se usarán valores por defecto."}
                                </span>
                            </div>
                            <button
                                onClick={() => setScheduleOpen(true)}
                                className="text-xs px-3 py-1.5 bg-brand-neon-cyan/10 text-brand-neon-cyan border border-brand-neon-cyan/50 rounded-lg hover:bg-brand-neon-cyan/20 transition-colors font-bold"
                            >
                                {formData.openingHours ? "Editar Horario" : "Configurar"}
                            </button>
                        </div>
                    </GlassPanel>

                    {/* Location */}
                    <GlassPanel className="p-6">
                        <div className="flex items-center gap-2 mb-4 text-brand-neon-cyan">
                            <MapPin size={20} />
                            <h2 className="font-bold text-white">Ubicación</h2>
                        </div>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-slate-400 text-xs uppercase mb-1">Departamento/Estado</label>
                                    <input
                                        type="text"
                                        value={formData.department || ''}
                                        readOnly
                                        className="w-full bg-white/5 border border-white/5 rounded-lg px-4 py-2 text-slate-400 cursor-not-allowed"
                                    />
                                </div>
                                <div>
                                    <label className="block text-slate-400 text-xs uppercase mb-1">Ciudad</label>
                                    <input
                                        type="text"
                                        value={formData.city || ''}
                                        onChange={e => setFormData({ ...formData, city: e.target.value })} // Allow fix if needed, but usually linked to region
                                        className="w-full bg-[#0B0F19] border border-white/10 rounded-lg px-4 py-2 text-white focus:border-brand-neon-cyan focus:outline-none"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-slate-400 text-xs uppercase mb-1">Dirección Exacta</label>
                                <input
                                    type="text"
                                    value={formData.address || ''}
                                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                                    className="w-full bg-[#0B0F19] border border-white/10 rounded-lg px-4 py-2 text-white focus:border-brand-neon-cyan focus:outline-none"
                                />
                            </div>
                        </div>
                    </GlassPanel>
                </div>

                {/* Right Column: Actions & Category Summary */}
                <div className="space-y-6">
                    <GlassPanel className="p-6 sticky top-6">
                        <h3 className="font-bold text-white mb-4">Acciones</h3>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="w-full flex items-center justify-center gap-2 bg-brand-neon-cyan text-black font-bold py-3 rounded-xl hover:shadow-[0_0_20px_rgba(0,240,255,0.4)] transition-all disabled:opacity-50"
                        >
                            <Save size={18} />
                            {saving ? 'Guardando...' : 'Guardar Cambios'}
                        </button>
                    </GlassPanel>

                    <GlassPanel className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2 text-brand-neon-cyan">
                                <Tag size={20} />
                                <h3 className="font-bold text-white">Categoría y Especialidades</h3>
                            </div>
                            <button
                                onClick={() => setShowMultiArea(!showMultiArea)}
                                className={`text-xs px-2 py-1 rounded border transition-colors ${showMultiArea ? 'bg-brand-neon-cyan/10 border-brand-neon-cyan text-brand-neon-cyan' : 'border-white/10 text-slate-500'}`}
                            >
                                {showMultiArea ? 'Modo Simple' : 'Áreas Adicionales'}
                            </button>
                        </div>

                        <div className="space-y-6">
                            {/* 1. Category Selection */}
                            <div>
                                <label className="block text-slate-400 text-xs uppercase mb-2">Área Principal</label>
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
                                                                toast.error("Máximo 2 áreas adicionales permitidas.");
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
                                                    <span className="text-sm font-medium">{cat.label.es}</span>
                                                    {isPrimary && <span className="ml-2 text-[10px] bg-brand-neon-cyan text-black px-1.5 rounded font-bold">Principal</span>}
                                                    {isAdditional && <span className="ml-2 text-[10px] bg-white/10 text-slate-300 px-1.5 rounded">Adicional</span>}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* 2. Subcategory Selection */}
                            {formData.category && (
                                <div className="animate-in fade-in slide-in-from-top-2">
                                    <label className="block text-slate-400 text-xs uppercase mb-2">Especialidad Principal</label>
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
                                                    <span className="text-xs font-medium leading-tight">{sub.label.es}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* 3. Specialties Selection */}
                            {formData.subcategory && (
                                <div className="animate-in fade-in slide-in-from-top-2">
                                    <label className="block text-slate-400 text-xs uppercase mb-2">Detalles / Servicios Específicos</label>
                                    <div className="flex flex-wrap gap-2">
                                        {(() => {
                                            const categoryData = Object.values(TAXONOMY).find(c => c.id === formData.category);
                                            const subData = categoryData?.subcategories.find(s => s.id === formData.subcategory);
                                            const availableSpecialties = subData?.specialties || [];

                                            if (availableSpecialties.length === 0) return <p className="text-xs text-slate-500 italic">No hay opciones adicionales.</p>;

                                            return availableSpecialties.map(spec => {
                                                const isSelected = formData.specialties?.includes(spec);
                                                return (
                                                    <button
                                                        key={spec}
                                                        onClick={() => {
                                                            const current = formData.specialties || [];
                                                            if (isSelected) {
                                                                setFormData({ ...formData, specialties: current.filter(t => t !== spec) });
                                                            } else {
                                                                if (current.length < 6) {
                                                                    setFormData({ ...formData, specialties: [...current, spec] });
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
                                                        {spec}
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
                title="Horario del Negocio"
                subtitle="Define cuándo está abierto tu local"
                saveLabel="Confirmar Horario"
            />
        </div>
    );
}
