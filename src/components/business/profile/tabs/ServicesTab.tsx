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
                    console.error("Failed to load services tab", err);
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

    return (
        <div className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {services.map((service) => (
                <div
                    key={service.id}
                    onClick={() => onBook(service)}
                    className="group bg-white border border-slate-200 rounded-2xl overflow-hidden hover:border-[#14B8A6]/40 hover:shadow-lg transition-all cursor-pointer flex flex-col"
                >
                    {/* ── Photo Banner ── */}
                    {service.imageUrl ? (
                        <div className="relative h-36 sm:h-44 overflow-hidden bg-slate-100 shrink-0">
                            <img
                                src={service.imageUrl}
                                alt={getServiceName(service, locale)}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                            {/* dark gradient at bottom */}
                            <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/40 to-transparent" />
                            {/* ⭐ Rating badge — bottom-left overlay */}
                            {rating !== undefined && rating > 0 && (
                                <div className="absolute bottom-2.5 left-3 flex items-center gap-1.5 bg-white/80 backdrop-blur-sm rounded-full px-2.5 py-1 shadow-sm">
                                    {[1, 2, 3, 4, 5].map(s => (
                                        <Star key={s} className={`w-3 h-3 ${s <= Math.round(rating) ? 'text-yellow-400 fill-yellow-400' : 'text-slate-300 fill-slate-200'}`} />
                                    ))}
                                    <span className="text-[11px] font-bold text-slate-800 ml-0.5">{rating.toFixed(1)}</span>
                                    {reviewCount !== undefined && reviewCount > 0 && (
                                        <span className="text-[10px] text-slate-500">· {reviewCount}</span>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : (
                        /* Placeholder */
                        <div className="h-36 sm:h-44 bg-gradient-to-br from-slate-100 to-slate-200 flex flex-col items-center justify-center gap-2 shrink-0 border-b border-slate-200 group-hover:from-[rgba(20,184,166,0.06)] group-hover:to-[rgba(20,184,166,0.10)] transition-colors duration-300 relative">
                            <div className="w-12 h-12 rounded-full bg-white/70 border border-slate-300 flex items-center justify-center shadow-sm">
                                <Camera className="w-5 h-5 text-slate-400" />
                            </div>
                            <span className="text-xs text-slate-400 font-medium">Sin foto del servicio</span>
                            {/* ⭐ Rating badge — bottom-left on placeholder too */}
                            {rating !== undefined && rating > 0 && (
                                <div className="absolute bottom-2.5 left-3 flex items-center gap-1.5 bg-white/80 backdrop-blur-sm rounded-full px-2.5 py-1 shadow-sm">
                                    {[1, 2, 3, 4, 5].map(s => (
                                        <Star key={s} className={`w-3 h-3 ${s <= Math.round(rating) ? 'text-yellow-400 fill-yellow-400' : 'text-slate-300 fill-slate-200'}`} />
                                    ))}
                                    <span className="text-[11px] font-bold text-slate-800 ml-0.5">{rating.toFixed(1)}</span>
                                    {reviewCount !== undefined && reviewCount > 0 && (
                                        <span className="text-[10px] text-slate-500">· {reviewCount}</span>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Content ── */}
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
                                {t('book') || 'Agendar'}
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
