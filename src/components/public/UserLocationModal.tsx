'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { MapPin, Navigation, X } from 'lucide-react';
import GlassPanel from '@/components/ui/GlassPanel';
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import { toast } from 'sonner';

interface UserLocationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onLocationGranted: (coords: { lat: number, lng: number }) => void;
}

export default function UserLocationModal({ isOpen, onClose, onLocationGranted }: UserLocationModalProps) {
    const t = useTranslations('location');
    const [isRequesting, setIsRequesting] = useState(false);

    if (!isOpen) return null;

    const handleDeny = () => {
        onClose();
        // Dispara evento reactivo o no hace nada. Ya no guardamos en DB.
    };

    const handleAllow = async () => {
        setIsRequesting(true);

        try {
            if (Capacitor.isNativePlatform()) {
                let status = await Geolocation.checkPermissions();
                if (status.location !== 'granted') {
                    status = await Geolocation.requestPermissions();
                    if (status.location !== 'granted') {
                        toast.error("Permiso denegado en el dispositivo.");
                        setIsRequesting(false);
                        onClose();
                        return;
                    }
                }
                const position = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
                onLocationGranted({ lat: position.coords.latitude, lng: position.coords.longitude });
                onClose();
                return;
            }

            // Web Fallback
            if (!navigator.geolocation) {
                toast.error("Tu navegador no soporta geolocalización.");
                setIsRequesting(false);
                onClose();
                return;
            }

            navigator.geolocation.getCurrentPosition(
                async (pos) => {
                    onLocationGranted({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                    onClose();
                },
                async (err) => {
                    console.warn("User geolocation denied or failed", err);
                    toast.error("No se pudo obtener la ubicación o se denegó el permiso.");
                    onClose();
                },
                { timeout: 10000 }
            );
        } catch (error) {
            console.error("Error requesting location:", error);
            setIsRequesting(false);
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={handleDeny} />

            <div className="relative w-full max-w-sm shrink-0 animate-in zoom-in-95 duration-200">
                <GlassPanel className="p-0 overflow-hidden shadow-2xl ring-1 ring-white/20">
                    <div className="bg-gradient-to-br from-teal-500 to-[#0F766E] p-6 text-center relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <Navigation size={120} />
                        </div>
                        <button
                            onClick={handleDeny}
                            className="absolute top-3 right-3 text-white/70 hover:text-white transition-colors p-1"
                        >
                            <X size={20} />
                        </button>

                        <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-md ring-4 ring-white/10">
                            <MapPin size={32} className="text-white" />
                        </div>
                        <h2 className="text-xl font-bold text-white mb-2">{t('modalTitle')}</h2>
                        <p className="text-white/90 text-sm leading-relaxed max-w-[280px] mx-auto">
                            {t('modalDesc')}
                        </p>
                    </div>

                    <div className="p-5 sm:p-6 bg-white flex justify-center">
                        <div className="flex gap-3 w-full max-w-xs">
                            <button
                                onClick={handleDeny}
                                disabled={isRequesting}
                                className="flex-1 py-3 px-4 rounded-xl font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-50"
                            >
                                {t('deny')}
                            </button>
                            <button
                                onClick={handleAllow}
                                disabled={isRequesting}
                                className="flex-1 py-3 px-4 rounded-xl font-bold text-white bg-[#14B8A6] hover:bg-[#0F9488] shadow-lg shadow-teal-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                            >
                                {isRequesting ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <Navigation size={18} />
                                        {t('allow')}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </GlassPanel>
            </div>
        </div>
    );
}
