'use client';

import { useEffect, useState, useRef } from 'react';
import { Camera, ChevronLeft, ChevronRight, Star, Zap } from 'lucide-react';
import { ServicesService, getServiceName } from '@/services/businessProfile.service';
import { useTranslations, useLocale } from 'next-intl';

interface ServicesTabProps {
    businessId: string;
    services?: any[];
    onBook: (service?: any) => void;
    rating?: number;
    reviewCount?: number;
}

/* ── Carrusel de fotos del servicio ────────────────────────────────── */
function FotoCarrusel({ images, nombre }: { images: string[]; nombre: string }) {
    const [idx, setIdx] = useState(0);
    const touchStartX = useRef<number | null>(null);

    const prev = () => setIdx(i => (i - 1 + images.length) % images.length);
    const next = () => setIdx(i => (i + 1) % images.length);

    const onTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
    const onTouchEnd = (e: React.TouchEvent) => {
        if (touchStartX.current === null) return;
        const delta = touchStartX.current - e.changedTouches[0].clientX;
        if (Math.abs(delta) > 40) delta > 0 ? next() : prev();
        touchStartX.current = null;
    };

    if (images.length === 1) {
        return (
            <img
                src={images[0]}
                alt={nombre}
                className="w-full h-full object-contain group-hover:scale-[1.02] transition-transform duration-500"
            />
        );
    }

    return (
        <div
            className="relative w-full h-full select-none"
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
        >
            {/* Imagen activa */}
            <img
                key={idx}
                src={images[idx]}
                alt={`${nombre} — foto ${idx + 1}`}
                className="w-full h-full object-contain animate-in fade-in duration-300"
            />

            {/* Flechas */}
            <button
                onClick={e => { e.stopPropagation(); prev(); }}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/40 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/60 transition-colors"
            >
                <ChevronLeft className="w-4 h-4" />
            </button>
            <button
                onClick={e => { e.stopPropagation(); next(); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/40 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/60 transition-colors"
            >
                <ChevronRight className="w-4 h-4" />
            </button>

            {/* Puntos indicadores */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                {images.map((_, i) => (
                    <button
                        key={i}
                        onClick={e => { e.stopPropagation(); setIdx(i); }}
                        className={`rounded-full transition-all ${i === idx ? 'w-4 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/50'}`}
                    />
                ))}
            </div>

            {/* Contador */}
            <span className="absolute top-2 right-2 text-[10px] bg-black/50 text-white px-1.5 py-0.5 rounded-full backdrop-blur-sm">
                {idx + 1}/{images.length}
            </span>
        </div>
    );
}

export default function ServicesTab({ businessId, services: initialServices, onBook, rating, reviewCount }: ServicesTabProps) {
    const t = useTranslations('business.publicProfile');
    const locale = useLocale();
    const [services, setServices] = useState<any[]>(initialServices || []);
    const [loading, setLoading] = useState(!initialServices);

    useEffect(() => {
        if (!initialServices) {
            const fetchServices = async () => {
                setLoading(true);
                try {
                    const data = await ServicesService.getServices(businessId);
                    setServices(data || []);
                } catch (err) {
                    console.error('Error al cargar servicios:', err);
                } finally {
                    setLoading(false);
                }
            };
            fetchServices();
        }
    }, [businessId, initialServices]);

    if (loading) {
        return (
            <div className="p-8 flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#14B8A6]"></div>
            </div>
        );
    }

    if (services.length === 0) {
        return (
            <div className="p-8 text-center text-slate-500 flex flex-col items-center">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                    <Zap className="w-8 h-8 opacity-20" />
                </div>
                <p>{t('noServices')}</p>
            </div>
        );
    }

    /* Badge de valoración reutilizable */
    const RatingBadge = () => {
        if (!rating || rating === 0) return null;
        return (
            <div className="absolute bottom-2.5 left-3 flex items-center gap-1 bg-white/85 backdrop-blur-sm rounded-full px-2.5 py-1 shadow-sm z-10">
                {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                        key={s}
                        className={`w-3 h-3 ${s <= Math.round(rating) ? 'text-yellow-400 fill-yellow-400' : 'text-slate-300 fill-slate-200'}`}
                    />
                ))}
                <span className="text-[11px] font-bold text-slate-800 ml-0.5">{rating.toFixed(1)}</span>
                {reviewCount !== undefined && reviewCount > 0 && (
                    <span className="text-[10px] text-slate-500"> · {reviewCount} reseñas</span>
                )}
            </div>
        );
    };

    return (
        <div className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {services.map((service) => {
                /* Retrocompatibilidad: si tiene images[] usar ese, si no usar imageUrl */
                const fotos: string[] = service.images?.length
                    ? service.images
                    : service.imageUrl
                        ? [service.imageUrl]
                        : [];
                const nombre = getServiceName(service, locale);

                return (
                    <div
                        key={service.id}
                        onClick={() => onBook(service)}
                        className="group bg-white border border-slate-200 rounded-2xl overflow-hidden hover:border-[#14B8A6]/40 hover:shadow-md transition-all cursor-pointer flex flex-col"
                    >
                        {/* ── Marco de foto (proporciones 16:9) ── */}
                        <div className="relative w-full aspect-video bg-slate-100 shrink-0 overflow-hidden border-b border-slate-100">
                            {fotos.length > 0 ? (
                                <FotoCarrusel images={fotos} nombre={nombre} />
                            ) : (
                                /* Espacio reservado cuando no hay foto */
                                <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-slate-100 to-slate-200 group-hover:from-teal-50 group-hover:to-teal-100 transition-colors duration-300">
                                    <div className="w-12 h-12 rounded-full bg-white/80 border border-slate-300 flex items-center justify-center shadow-sm">
                                        <Camera className="w-5 h-5 text-slate-400" />
                                    </div>
                                    <span className="text-xs text-slate-400 font-medium">Sin foto del servicio</span>
                                </div>
                            )}
                            {/* Badge de valoración — esquina inferior izquierda */}
                            <RatingBadge />
                        </div>

                        {/* ── Contenido textual ── */}
                        <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                            <div>
                                <h3 className="font-bold text-slate-900 text-base mb-1 group-hover:text-[#0F766E] transition-colors">
                                    {nombre}
                                </h3>
                                <p className="text-slate-500 text-sm line-clamp-2">
                                    {service.description || t('noDescription')}
                                </p>
                            </div>

                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-lg font-bold text-slate-900">
                                        {service.currency} {service.price}
                                    </div>
                                    {service.isVariablePrice && (
                                        <span className="text-[10px] text-slate-500 uppercase">{t('fromPrice')}</span>
                                    )}
                                </div>

                                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[rgba(20,184,166,0.08)] text-[#14B8A6] text-sm font-semibold group-hover:bg-[#14B8A6] group-hover:text-white transition-colors">
                                    Agendar
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
