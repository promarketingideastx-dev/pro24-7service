'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { BusinessProfileService, BusinessProfileData } from '@/services/businessProfile.service';
import GlassPanel from '@/components/ui/GlassPanel';
import ImageUploader from '@/components/ui/ImageUploader';
import { TAXONOMY } from '@/lib/taxonomy';
import { Save, Building, MapPin, Tag, Camera, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function BusinessProfilePage() {
    const { user, userProfile } = useAuth(); // Assuming userProfile has businessProfileId
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [formData, setFormData] = useState<Partial<BusinessProfileData>>({});

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
            alert("Perfil actualizado correctamente");
        } catch (error) {
            console.error("Error updating", error);
            alert("Error al actualizar");
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
                        <div className="flex items-center gap-2 mb-4 text-slate-400">
                            <Tag size={18} />
                            <h3 className="font-bold text-white">Categoría</h3>
                        </div>
                        <div className="space-y-4">
                            <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                                <span className="text-xs text-slate-500 block">Principal</span>
                                <span className="text-brand-neon-cyan font-medium">
                                    {Object.values(TAXONOMY).find(c => c.id === formData.category)?.label.es || formData.category}
                                </span>
                            </div>

                            {formData.additionalCategories && formData.additionalCategories.length > 0 && (
                                <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                                    <span className="text-xs text-slate-500 block">Adicionales</span>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        {formData.additionalCategories.map(cat => (
                                            <span key={cat} className="text-xs bg-white/10 px-2 py-1 rounded text-slate-300">
                                                {Object.values(TAXONOMY).find(c => c.id === cat)?.label.es || cat}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                                <span className="text-xs text-slate-500 block">Especialidades</span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                    {formData.specialties?.map(s => (
                                        <span key={s} className="text-xs bg-white/10 px-2 py-1 rounded text-slate-300">{s}</span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </GlassPanel>
                </div>
            </div>
        </div>
    );
}
