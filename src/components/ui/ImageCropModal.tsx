'use client';

import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { X, ZoomIn, ZoomOut, Check, RotateCcw, RotateCw } from 'lucide-react';

interface Area {
    x: number;
    y: number;
    width: number;
    height: number;
}

interface Props {
    imageSrc: string;         // Base64 or object URL of image to crop
    aspectRatio?: number;     // default: 16/9 for cover. Ignored if freeCrop is true.
    freeCrop?: boolean;       // If true, allows cropping without fixed aspect ratio
    onComplete: (croppedBlob: Blob) => void;
    onClose: () => void;
}

// Helper to generate a safe canvas
const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
        const image = new Image();
        image.addEventListener('load', () => resolve(image));
        image.addEventListener('error', (error) => reject(error));
        // needed to avoid cross-origin issues on CodeSandbox
        image.setAttribute('crossOrigin', 'anonymous'); 
        image.src = url;
    });

function getRadianAngle(degreeValue: number) {
    return (degreeValue * Math.PI) / 180;
}

/**
 * Returns the new bounding area of a rotated rectangle.
 */
function rotateSize(width: number, height: number, rotation: number) {
    const rotRad = getRadianAngle(rotation);
    return {
        width:
            Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
        height:
            Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
    };
}

async function getCroppedImg(
    imageSrc: string,
    pixelCrop: Area,
    rotation: number = 0
): Promise<Blob> {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
        throw new Error('No 2d context');
    }

    // calculate bounding box of the rotated image
    const { width: bBoxWidth, height: bBoxHeight } = rotateSize(
        image.width,
        image.height,
        rotation
    );

    canvas.width = bBoxWidth;
    canvas.height = bBoxHeight;

    // translate canvas context to a central location to allow rotating and flipping around the center
    ctx.translate(bBoxWidth / 2, bBoxHeight / 2);
    ctx.rotate(getRadianAngle(rotation));
    ctx.translate(-image.width / 2, -image.height / 2);

    // draw rotated image
    ctx.drawImage(image, 0, 0);

    const croppedCanvas = document.createElement('canvas');
    const croppedCtx = croppedCanvas.getContext('2d');

    if (!croppedCtx) {
        throw new Error('No 2d context');
    }

    croppedCanvas.width = pixelCrop.width;
    croppedCanvas.height = pixelCrop.height;

    // Extract the cropped image from the rotated canvas
    croppedCtx.drawImage(
        canvas,
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
        croppedCanvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Canvas is empty'));
        }, 'image/jpeg', 0.92);
    });
}

export default function ImageCropModal({ imageSrc, aspectRatio = 16 / 9, freeCrop = false, onComplete, onClose }: Props) {
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
    const [processing, setProcessing] = useState(false);

    const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
        setCroppedAreaPixels(croppedPixels);
    }, []);

    const handleApply = async () => {
        if (!croppedAreaPixels) return;
        setProcessing(true);
        try {
            const blob = await getCroppedImg(imageSrc, croppedAreaPixels, rotation);
            await onComplete(blob);
        } catch (e) {
            console.error('Crop error:', e);
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                    <div>
                        <h3 className="font-bold text-slate-900">Ajustar foto</h3>
                        <p className="text-xs text-slate-500 mt-0.5">Mueve, acerca o rota la imagen para encuadrarla</p>
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
                        rotation={rotation}
                        aspect={freeCrop ? undefined : aspectRatio}
                        onCropChange={setCrop}
                        onZoomChange={setZoom}
                        onRotationChange={setRotation}
                        onCropComplete={onCropComplete}
                        showGrid
                        style={{
                            containerStyle: { borderRadius: 0 },
                            cropAreaStyle: { border: '2px solid rgba(20,184,166,0.9)', boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)' },
                        }}
                    />
                </div>

                {/* Controls Area (Zoom + Rotation) */}
                <div className="px-6 pt-5 pb-2 space-y-4">
                    {/* Zoom */}
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
                    </div>

                    {/* Rotation */}
                    <div className="flex items-center gap-3">
                        <button onClick={() => setRotation(r => r - 90)} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-500 transition-colors" title="Rotar 90° izquierda">
                            <RotateCcw size={18} />
                        </button>
                        <input
                            type="range"
                            min={-180}
                            max={180}
                            step={1}
                            value={rotation}
                            onChange={e => setRotation(Number(e.target.value))}
                            className="flex-1 h-2 accent-teal-500 cursor-pointer"
                        />
                        <button onClick={() => setRotation(r => r + 90)} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-500 transition-colors" title="Rotar 90° derecha">
                            <RotateCw size={18} />
                        </button>
                    </div>
                </div>

                {/* Reset Buttons */}
                <div className="px-6 flex justify-center pb-2">
                    <button
                        onClick={() => { setZoom(1); setRotation(0); setCrop({ x: 0, y: 0 }); }}
                        className="text-xs font-medium text-slate-400 hover:text-slate-600 transition-colors underline decoration-slate-300 underline-offset-2"
                    >
                        Restablecer valores
                    </button>
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
