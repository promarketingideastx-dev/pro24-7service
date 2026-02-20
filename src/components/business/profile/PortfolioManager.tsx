'use client';

import { useState, useEffect, useRef } from 'react';
import { Upload, X, Trash2, Plus, Loader2, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { PortfolioService, PortfolioItem, BusinessProfileService } from '@/services/businessProfile.service';
import { StorageService } from '@/services/storage.service';

interface PortfolioManagerProps {
    businessId: string;
}

export default function PortfolioManager({ businessId }: PortfolioManagerProps) {
    const [items, setItems] = useState<PortfolioItem[]>([]);
    const [loading, setLoading] = useState(true);

    // Add New State
    const [isAdding, setIsAdding] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [newItem, setNewItem] = useState<{
        file: File | null;
        previewUrl: string | null;
        title: string;
        description: string;
    }>({
        file: null,
        previewUrl: null,
        title: '',
        description: ''
    });

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Load initial data
    useEffect(() => {
        loadPortfolio();
    }, [businessId]);

    const loadPortfolio = async () => {
        try {
            const data = await PortfolioService.getPortfolio(businessId);
            setItems(data);
        } catch (error) {
            console.error("Error loading portfolio:", error);
            toast.error("Error al cargar portafolio");
        } finally {
            setLoading(false);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Preview
        const objectUrl = URL.createObjectURL(file);
        setNewItem(prev => ({ ...prev, file, previewUrl: objectUrl }));
    };

    const handleSave = async () => {
        if (!newItem.file || !businessId) return;

        setUploading(true);
        try {
            // 1. Upload Image
            const url = await StorageService.uploadBusinessImage(businessId, newItem.file);

            // 2. Save Metadata
            await PortfolioService.addPortfolioItem(businessId, {
                url,
                title: newItem.title,
                description: newItem.description
            });

            toast.success("Foto añadida al portafolio");

            // Reset and reload
            setIsAdding(false);
            setNewItem({ file: null, previewUrl: null, title: '', description: '' });
            loadPortfolio();

        } catch (error) {
            console.error("Error saving portfolio item:", error);
            toast.error("Error al guardar. Intenta de nuevo.");
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (id: string, url: string) => {
        if (!confirm("¿Estás seguro de eliminar esta foto?")) return;

        try {
            await PortfolioService.deletePortfolioItem(businessId, id, url);
            toast.success("Foto eliminada");
            setItems(prev => prev.filter(i => i.id !== id));
        } catch (error) {
            console.error("Error deleting item:", error);
            toast.error("Error al eliminar foto");
        }
    };

    const handleSetCover = async (url: string) => {
        try {
            await BusinessProfileService.setAsCover(businessId, url);
            toast.success("Portada actualizada");
        } catch (error) {
            console.error("Error setting cover:", error);
            toast.error("Error al actualizar portada");
        }
    };

    const handleSetLogo = async (url: string) => {
        try {
            await BusinessProfileService.setAsLogo(businessId, url);
            toast.success("Logo actualizado");
        } catch (error) {
            console.error("Error setting logo:", error);
            toast.error("Error al actualizar logo");
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-500">Cargando portafolio...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="font-bold text-white text-lg">Galería y Trabajos</h3>
                {!isAdding && (
                    <button
                        onClick={() => setIsAdding(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-brand-neon-cyan/10 text-brand-neon-cyan border border-brand-neon-cyan/50 rounded-lg hover:bg-brand-neon-cyan/20 transition-colors text-sm font-bold"
                    >
                        <Plus size={16} />
                        Agregar Foto
                    </button>
                )}
            </div>

            {/* Add New Form */}
            {isAdding && (
                <div className="bg-[#1a1030] border border-white/10 rounded-xl p-6 animate-in fade-in slide-in-from-top-4">
                    <div className="flex justify-between items-start mb-4">
                        <h4 className="text-white font-medium">Nueva Publicación</h4>
                        <button onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-white"><X size={20} /></button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Image Upload Area */}
                        <div>
                            <div
                                onClick={() => !newItem.file && fileInputRef.current?.click()}
                                className={`
                                    aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center relative overflow-hidden cursor-pointer transition-all
                                    ${newItem.previewUrl ? 'border-brand-neon-cyan/50' : 'border-white/10 hover:bg-white/5 hover:border-white/30'}
                                `}
                            >
                                {newItem.previewUrl ? (
                                    <>
                                        <img src={newItem.previewUrl} className="w-full h-full object-cover" alt="Preview" />
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setNewItem(prev => ({ ...prev, file: null, previewUrl: null }));
                                            }}
                                            className="absolute top-2 right-2 p-1 bg-black/60 text-white rounded-full hover:bg-red-500"
                                        >
                                            <X size={16} />
                                        </button>
                                    </>
                                ) : (
                                    <div className="text-center p-4">
                                        <div className="bg-white/5 p-3 rounded-full inline-block mb-3">
                                            <Upload className="text-slate-400" size={24} />
                                        </div>
                                        <p className="text-sm text-slate-300 font-medium">Sube una imagen</p>
                                        <p className="text-xs text-slate-500 mt-1">JPG, PNG (Max 5MB)</p>
                                    </div>
                                )}
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileSelect}
                                    accept="image/*"
                                    className="hidden"
                                />
                            </div>
                        </div>

                        {/* Metadata Fields */}
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs uppercase text-slate-400 mb-1">Título (Opcional)</label>
                                <input
                                    type="text"
                                    value={newItem.title}
                                    onChange={e => setNewItem(prev => ({ ...prev, title: e.target.value }))}
                                    placeholder="Ej: Resultado Final"
                                    className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-brand-neon-cyan focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs uppercase text-slate-400 mb-1">Descripción / Historia</label>
                                <textarea
                                    value={newItem.description}
                                    onChange={e => setNewItem(prev => ({ ...prev, description: e.target.value }))}
                                    placeholder="Describe los detalles del servicio o el resultado obtenido..."
                                    className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-brand-neon-cyan focus:outline-none h-32 resize-none"
                                />
                            </div>

                            <button
                                onClick={handleSave}
                                disabled={!newItem.file || uploading}
                                className="w-full py-3 bg-brand-neon-cyan text-black font-bold rounded-lg hover:shadow-[0_0_15px_rgba(0,240,255,0.4)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {uploading ? <Loader2 className="animate-spin" size={20} /> : <Upload size={20} />}
                                {uploading ? 'Guardando...' : 'Publicar Foto'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Grid List */}
            {items.length === 0 && !isAdding ? (
                <div className="text-center py-12 border border-dashed border-white/10 rounded-xl">
                    <ImageIcon className="mx-auto text-slate-600 mb-4" size={48} />
                    <p className="text-slate-400">Aún no has subido fotos a tu portafolio.</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {items.map((item) => (
                        <div key={item.id} className="group relative aspect-square rounded-xl overflow-hidden bg-black/20 border border-white/5">
                            <img src={item.url} alt={item.title || 'Portfolio'} className="w-full h-full object-cover transition-transform group-hover:scale-105" />

                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-3">
                                <div className="flex justify-end gap-1">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleSetCover(item.url);
                                        }}
                                        title="Usar como Portada"
                                        className="p-1.5 bg-black/50 text-white rounded-full hover:bg-brand-neon-cyan hover:text-black transition-colors"
                                    >
                                        <ImageIcon size={14} />
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleSetLogo(item.url);
                                        }}
                                        title="Usar como Logo"
                                        className="p-1.5 bg-black/50 text-white rounded-full hover:bg-purple-500 hover:text-white transition-colors"
                                    >
                                        <div className="text-[10px] font-bold px-1">LOGO</div>
                                    </button>
                                </div>

                                <div className="relative">
                                    {item.title && <p className="text-white text-xs font-bold line-clamp-1">{item.title}</p>}
                                    <p className="text-xs text-slate-400 line-clamp-1 mb-2">{item.description || 'Sin descripción'}</p>

                                    <button
                                        onClick={() => handleDelete(item.id!, item.url)}
                                        className="absolute bottom-0 right-0 p-1.5 bg-red-500/80 text-white rounded-full hover:bg-red-600 transition-colors"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
