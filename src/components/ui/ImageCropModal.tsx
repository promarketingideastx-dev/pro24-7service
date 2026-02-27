'use client';

import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { X, ZoomIn, ZoomOut, Check, RotateCcw } from 'lucide-react';

interface Area {
    x: number;
    y: number;
    width: number;
    height: number;
}

interface Props {
    imageSrc: string;         // Base64 or object URL of image to crop
    aspectRatio?: number;     // default: 16/9 for cover
    onComplete: (croppedBlob: Blob) => void;
    onClose: () => void;
}

async function getCroppedImg(imageSrc: string, pixelCrop: Area): Promise<Blob> {
    const image = new Image();
    image.src = imageSrc;
    await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = reject;
    });

    const canvas = document.createElement('canvas');
    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;
    const ctx = canvas.getContext('2d')!;

    ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        pixelCrop.width,
        pixelCrop.height
    );

    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Canvas is empty'));
        }, 'image/jpeg', 0.92);
    });
}

export default function ImageCropModal({ imageSrc, aspectRatio = 16 / 9, onComplete, onClose }: Props) {
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
    const [processing, setProcessing] = useState(false);

    const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
        setCroppedAreaPixels(croppedPixels);
    }, []);

    const handleApply = async () => {
        if (!croppedAreaPixels) return;
        setProcessing(true);
        try {
            const blob = await getCroppedImg(imageSrc, croppedAreaPixels);
            onComplete(blob);
        } catch (e) {
            console.error('Crop error:', e);
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                    <div>
                        <h3 className="font-bold text-slate-900">Ajustar foto de cabecera</h3>
                        <p className="text-xs text-slate-500 mt-0.5">Mueve y ajusta el zoom para encuadrar la imagen perfectamente</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Crop Area */}
                <div className="relative w-full bg-slate-900" style={{ height: '340px' }}>
                    <Cropper
                        image={imageSrc}
                        crop={crop}
                        zoom={zoom}
                        aspect={aspectRatio}
                        onCropChange={setCrop}
                        onZoomChange={setZoom}
                        onCropComplete={onCropComplete}
                        showGrid
                        style={{
                            containerStyle: { borderRadius: 0 },
                            cropAreaStyle: { border: '2px solid rgba(20,184,166,0.9)', boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)' },
                        }}
                    />
                </div>

                {/* Zoom Slider */}
                <div className="px-6 pt-5 pb-2">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setZoom(z => Math.max(1, z - 0.1))} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-500 transition-colors">
                            <ZoomOut size={18} />
                        </button>
                        <input
                            type="range"
                            min={1}
                            max={3}
                            step={0.05}
                            value={zoom}
                            onChange={e => setZoom(Number(e.target.value))}
                            className="flex-1 h-2 accent-teal-500 cursor-pointer"
                        />
                        <button onClick={() => setZoom(z => Math.min(3, z + 0.1))} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-500 transition-colors">
                            <ZoomIn size={18} />
                        </button>
                        <button
                            onClick={() => { setZoom(1); setCrop({ x: 0, y: 0 }); }}
                            className="p-1.5 rounded-full hover:bg-slate-100 text-slate-500 transition-colors ml-1"
                            title="Restablecer"
                        >
                            <RotateCcw size={16} />
                        </button>
                    </div>
                    <p className="text-center text-xs text-slate-400 mt-2">Zoom {Math.round(zoom * 100)}%</p>
                </div>

                {/* Actions */}
                <div className="flex gap-3 px-6 pb-6 pt-2">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-colors text-sm"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleApply}
                        disabled={processing}
                        className="flex-1 py-3 rounded-xl bg-teal-500 hover:bg-teal-600 text-white font-bold transition-colors text-sm flex items-center justify-center gap-2 disabled:opacity-60 shadow-md shadow-teal-500/30"
                    >
                        {processing ? (
                            <span className="animate-spin inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full" />
                        ) : (
                            <Check size={16} />
                        )}
                        {processing ? 'Aplicando...' : 'Aplicar recorte'}
                    </button>
                </div>
            </div>
        </div>
    );
}
