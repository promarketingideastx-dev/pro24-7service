'use client';

import { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { StorageService } from '@/services/storage.service';
import { useAuth } from '@/context/AuthContext';
import ImageCropModal from './ImageCropModal';

interface ImageUploaderProps {
    images: string[];
    onImagesChange: (urls: string[]) => void;
    maxImages?: number;
    disabled?: boolean;
}

export default function ImageUploader({ images, onImagesChange, maxImages = 5, disabled = false }: ImageUploaderProps) {
    const { user } = useAuth();
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [cropQueue, setCropQueue] = useState<File[]>([]);
    const [processedUrls, setProcessedUrls] = useState<string[]>([]);
    const [originalQueueLength, setOriginalQueueLength] = useState(0);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || !user) return;

        // Limitar la cola a los espacios disponibles
        const availableSlots = maxImages - images.length;
        const filesToProcess = Array.from(files).slice(0, availableSlots);

        if (filesToProcess.length > 0) {
            setCropQueue(filesToProcess);
            setProcessedUrls([]);
            setOriginalQueueLength(filesToProcess.length);
        }

        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleCropComplete = async (croppedBlob: Blob) => {
        if (!user || cropQueue.length === 0) return;

        setUploading(true);
        const currentFile = cropQueue[0];

        try {
            const fileToUpload = new File([croppedBlob], currentFile.name, { type: 'image/jpeg' });
            const url = await StorageService.uploadBusinessImage(user.uid, fileToUpload);
            
            const newProcessed = [...processedUrls, url];
            setProcessedUrls(newProcessed);

            const remainingQueue = cropQueue.slice(1);
            if (remainingQueue.length === 0) {
                // Done with queue
                onImagesChange([...images, ...newProcessed].slice(0, maxImages));
            }
            setCropQueue(remainingQueue);
        } catch (error) {
            console.error("Error uploading image:", error);
            toast.error("Error al subir imagen. Intenta de nuevo.");
            // On error, we abort the rest of the queue to be safe.
            setCropQueue([]);
        } finally {
            setUploading(false);
        }
    };

    const handleRemove = (urlToRemove: string) => {
        const filtered = images.filter(url => url !== urlToRemove);
        onImagesChange(filtered);
        // Optional: Call deleteImage service here or cleanup later?
        // Usually safer to keep for now until form submit/cleanup routine.
    };

    return (
        <div className="space-y-4">
            {/* Image Grid */}
            {images.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {images.map((url, idx) => (
                        <div key={idx} className="relative group aspect-square rounded-xl overflow-hidden border border-slate-200 bg-black/20">
                            <img src={url} alt={`Imagen ${idx + 1}`} className="w-full h-full object-cover" />
                            {!disabled && (
                                <button
                                    onClick={() => handleRemove(url)}
                                    className="absolute top-2 right-2 p-1 bg-black/50 hover:bg-red-500/80 text-white rounded-full transition-colors opacity-0 group-hover:opacity-100"
                                >
                                    <X size={16} />
                                </button>
                            )}
                            {idx === 0 && (
                                <div className="absolute bottom-0 left-0 right-0 bg-slate-900/40 text-xs text-center py-1 text-white">
                                    Portada
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Upload Button */}
            {images.length < maxImages && (
                <div
                    onClick={() => !disabled && !uploading && fileInputRef.current?.click()}
                    className={`
                        border-2 border-dashed border-slate-200 rounded-xl p-8
                        flex flex-col items-center justify-center gap-2
                        transition-all cursor-pointer
                        ${uploading ? 'bg-slate-50 opacity-50 cursor-wait' : 'hover:bg-slate-50 hover:border-brand-neon-cyan/50'}
                    `}
                >
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        accept="image/png, image/jpeg, image/webp"
                        multiple
                        className="hidden"
                        disabled={disabled || uploading}
                    />

                    {uploading ? (
                        <>
                            <Loader2 className="animate-spin text-brand-neon-cyan" size={32} />
                            <span className="text-sm text-slate-400">Subiendo...</span>
                        </>
                    ) : (
                        <>
                            <div className="bg-brand-neon-cyan/10 p-3 rounded-full mb-2">
                                <Upload className="text-brand-neon-cyan" size={24} />
                            </div>
                            <span className="text-sm font-medium text-slate-200">
                                Click para subir fotos
                            </span>
                            <span className="text-xs text-slate-500">
                                PNG, JPG o WEBP (Max 5MB)
                            </span>
                            <span className="text-xs text-slate-600 mt-2">
                                {images.length} / {maxImages}
                            </span>
                        </>
                    )}
                </div>
            )}

            {/* Crop Queue Modal */}
            {cropQueue.length > 0 && !uploading && (
                <ImageCropModal
                    imageSrc={URL.createObjectURL(cropQueue[0])}
                    aspectRatio={1}
                    freeCrop={false}
                    onComplete={handleCropComplete}
                    onClose={() => setCropQueue([])}
                />
            )}
        </div>
    );
}
