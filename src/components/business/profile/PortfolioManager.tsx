'use client';

import { useState, useEffect, useRef } from 'react';
import { Upload, X, Trash2, Plus, Loader2, Image as ImageIcon, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { PortfolioService, PortfolioItem, BusinessProfileService } from '@/services/businessProfile.service';
import { StorageService } from '@/services/storage.service';
import { useTranslations } from 'next-intl';

interface PortfolioManagerProps {
    businessId: string;
}

/** Inline confirmation modal — same dark-glass style as the rest of the project */
function ConfirmDeleteModal({
    onConfirm,
    onCancel,
    title,
    body,
    confirmLabel,
    cancelLabel,
}: {
    onConfirm: () => void;
    onCancel: () => void;
    title: string;
    body: string;
    confirmLabel: string;
    cancelLabel: string;
}) {
    return (
        <div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4 animate-in fade-in duration-200"
            onClick={onCancel}
        >
            <div
                className="bg-white border border-slate-200 rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-start gap-4 mb-5">
                    <div className="p-2.5 rounded-full bg-red-500/10 text-red-400 shrink-0">
                        <AlertTriangle size={20} />
                    </div>
                    <div>
                        <h3 className="text-slate-900 font-bold text-base leading-tight">{title}</h3>
                        <p className="text-slate-400 text-sm mt-1 leading-relaxed">{body}</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={onCancel}
                        className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors text-sm font-medium"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        onClick={onConfirm}
                        className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white transition-colors text-sm font-bold shadow-lg shadow-red-500/20"
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function PortfolioManager({ businessId }: PortfolioManagerProps) {
    const t = useTranslations('business.profile');
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

    // Delete confirmation modal state
    const [deleteTarget, setDeleteTarget] = useState<{ id: string; url: string } | null>(null);

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
            toast.error(t('portfolioLoadError'));
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

            toast.success(t('portfolioAdded'));

            // Reset and reload
            setIsAdding(false);
            setNewItem({ file: null, previewUrl: null, title: '', description: '' });
            loadPortfolio();

        } catch (error) {
            console.error("Error saving portfolio item:", error);
            toast.error(t('portfolioSaveError'));
        } finally {
            setUploading(false);
        }
    };

    /** Opens the confirmation modal; actual delete runs in confirmDelete() */
    const handleDeleteRequest = (id: string, url: string) => {
        setDeleteTarget({ id, url });
    };

    /** Runs after the user confirms via the modal */
    const confirmDelete = async () => {
        if (!deleteTarget) return;
        const { id, url } = deleteTarget;
        setDeleteTarget(null);
        try {
            await PortfolioService.deletePortfolioItem(businessId, id, url);
            toast.success(t('portfolioDeleted'));
            setItems(prev => prev.filter(i => i.id !== id));
        } catch (error) {
            console.error("Error deleting item:", error);
            toast.error(t('portfolioSaveError'));
        }
    };

    const handleSetCover = async (url: string) => {
        try {
            await BusinessProfileService.setAsCover(businessId, url);
            toast.success(t('coverUpdated'));
        } catch (error) {
            console.error("Error setting cover:", error);
            toast.error(t('portfolioSaveError'));
        }
    };

    const handleSetLogo = async (url: string) => {
        try {
            await BusinessProfileService.setAsLogo(businessId, url);
            toast.success(t('logoUpdated'));
        } catch (error) {
            console.error("Error setting logo:", error);
            toast.error(t('portfolioSaveError'));
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-500">{t('loadingPortfolio')}</div>;

    return (
        <>
            {/* Confirmation Modal */}
            {deleteTarget && (
                <ConfirmDeleteModal
                    title={t('portfolioDeleteTitle')}
                    body={t('portfolioDeleteBody')}
                    confirmLabel={t('portfolioDeleteConfirm')}
                    cancelLabel={t('portfolioDeleteCancel')}
                    onConfirm={confirmDelete}
                    onCancel={() => setDeleteTarget(null)}
                />
            )}

            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <h3 className="font-bold text-slate-900 text-lg">{t('galleryAndWork')}</h3>
                    {!isAdding && (
                        <button
                            onClick={() => setIsAdding(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-[rgba(20,184,166,0.08)] text-[#0F766E] border border-[#14B8A6]/50 rounded-lg hover:bg-[rgba(20,184,166,0.15)] transition-colors text-sm font-bold"
                        >
                            <Plus size={16} />
                            {t('addPhoto')}
                        </button>
                    )}
                </div>

                {/* Add New Form */}
                {isAdding && (
                    <div className="bg-white border border-slate-200 rounded-xl p-6 animate-in fade-in slide-in-from-top-4">
                        <div className="flex justify-between items-start mb-4">
                            <h4 className="text-slate-900 font-medium">{t('newPost')}</h4>
                            <button onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-slate-800"><X size={20} /></button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Image Upload Area */}
                            <div>
                                <div
                                    onClick={() => !newItem.file && fileInputRef.current?.click()}
                                    className={`
                                        aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center relative overflow-hidden cursor-pointer transition-all
                                        ${newItem.previewUrl ? 'border-brand-neon-cyan/50' : 'border-slate-200 hover:bg-slate-50 hover:border-slate-300'}
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
                                                className="absolute top-2 right-2 p-1 bg-slate-900/40 text-white rounded-full hover:bg-red-500"
                                            >
                                                <X size={16} />
                                            </button>
                                        </>
                                    ) : (
                                        <div className="text-center p-4">
                                            <div className="bg-slate-50 p-3 rounded-full inline-block mb-3">
                                                <Upload className="text-slate-400" size={24} />
                                            </div>
                                            <p className="text-sm text-slate-500 font-medium">{t('uploadImage')}</p>
                                            <p className="text-xs text-slate-500 mt-1">{t('uploadHint')}</p>
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
                                    <label className="block text-xs uppercase text-slate-400 mb-1">{t('titleOptional')}</label>
                                    <input
                                        type="text"
                                        value={newItem.title}
                                        onChange={e => setNewItem(prev => ({ ...prev, title: e.target.value }))}
                                        placeholder={t('titlePlaceholder')}
                                        className="w-full bg-white border border-[#E6E8EC] rounded-lg px-4 py-2 text-slate-900 focus:border-[#14B8A6] focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs uppercase text-slate-400 mb-1">{t('descHistory')}</label>
                                    <textarea
                                        value={newItem.description}
                                        onChange={e => setNewItem(prev => ({ ...prev, description: e.target.value }))}
                                        placeholder={t('descPlaceholder')}
                                        className="w-full bg-white border border-[#E6E8EC] rounded-lg px-4 py-2 text-slate-900 focus:border-[#14B8A6] focus:outline-none h-32 resize-none"
                                    />
                                </div>

                                <button
                                    onClick={handleSave}
                                    disabled={!newItem.file || uploading}
                                    className="w-full py-3 bg-[#14B8A6] hover:bg-[#0F9488] text-white font-bold rounded-lg shadow-[0_4px_14px_rgba(20,184,166,0.25)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {uploading ? <Loader2 className="animate-spin" size={20} /> : <Upload size={20} />}
                                    {uploading ? t('saving') : t('publishPhoto')}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Grid List */}
                {items.length === 0 && !isAdding ? (
                    <div className="text-center py-12 border border-dashed border-slate-200 rounded-xl">
                        <ImageIcon className="mx-auto text-slate-600 mb-4" size={48} />
                        <p className="text-slate-400">{t('noPhotosYet')}</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {items.map((item) => (
                            <div key={item.id} className="group relative aspect-square rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                                <img src={item.url} alt={item.title || 'Portfolio'} className="w-full h-full object-cover transition-transform group-hover:scale-105" />

                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-3">
                                    <div className="flex justify-end gap-1">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleSetCover(item.url);
                                            }}
                                            title={t('setAsCover')}
                                            className="p-1.5 bg-black/50 text-white rounded-full hover:bg-[#14B8A6] hover:text-white transition-colors"
                                        >
                                            <ImageIcon size={14} />
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleSetLogo(item.url);
                                            }}
                                            title={t('setAsLogo')}
                                            className="p-1.5 bg-black/50 text-white rounded-full hover:bg-purple-500 hover:text-slate-800 transition-colors"
                                        >
                                            <div className="text-[10px] font-bold px-1">LOGO</div>
                                        </button>
                                    </div>

                                    <div className="relative">
                                        {item.title && <p className="text-white text-xs font-bold line-clamp-1">{item.title}</p>}
                                        <p className="text-xs text-slate-400 line-clamp-1 mb-2">{item.description || t('noDescription')}</p>

                                        <button
                                            onClick={() => handleDeleteRequest(item.id!, item.url)}
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
        </>
    );
}
