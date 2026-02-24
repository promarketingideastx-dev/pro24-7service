'use client';

import { useEffect, useState } from 'react';
import { Camera, ChevronRight, Star, Zap } from 'lucide-react';
import { ServicesService, getServiceName } from '@/services/businessProfile.service';
import { useTranslations, useLocale } from 'next-intl';

interface ServicesTabProps {
    businessId: string;
    services?: any[];
    onBook: (service?: any) => void;
    rating?: number;
    reviewCount?: number;
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
            <div className="absolute bottom-2.5 left-3 flex items-center gap-1 bg-white/85 backdrop-blur-sm rounded-full px-2.5 py-1 shadow-sm">
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
            {services.map((service) => (
                <div
                    key={service.id}
                    onClick={() => onBook(service)}
                    className="group bg-white border border-slate-200 rounded-2xl overflow-hidden hover:border-[#14B8A6]/40 hover:shadow-md transition-all cursor-pointer flex flex-col"
                >
                    {/* ── Marco de imagen (proporciones 16:9, sin recorte) ── */}
                    <div className="relative w-full aspect-video bg-slate-100 shrink-0 overflow-hidden border-b border-slate-100">
                        {service.imageUrl ? (
                            <>
                                <img
                                    src={service.imageUrl}
                                    alt={getServiceName(service, locale)}
                                    className="w-full h-full object-contain group-hover:scale-[1.02] transition-transform duration-500"
                                />
                                {/* Gradiente sutil en los bordes inferiores para legibilidad del badge */}
                                <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
                            </>
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
                                {getServiceName(service, locale)}
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
            ))}
        </div>
    );
}
