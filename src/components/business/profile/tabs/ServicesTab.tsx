'use client';

import { useEffect, useState } from 'react';
import { Calendar, ChevronRight, Zap } from 'lucide-react';
import { ServicesService } from '@/services/businessProfile.service';

interface ServicesTabProps {
    businessId: string;
    services?: any[]; // Allow pre-fetched services
    onBook: (service?: any) => void;
}

export default function ServicesTab({ businessId, services: initialServices, onBook }: ServicesTabProps) {
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
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-brand-neon-cyan"></div>
            </div>
        );
    }

    if (services.length === 0) {
        return (
            <div className="p-8 text-center text-slate-500 flex flex-col items-center">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                    <Zap className="w-8 h-8 opacity-20" />
                </div>
                <p>Este negocio aún no ha publicado sus servicios.</p>
            </div>
        );
    }

    // Group services (Optional: if we had categories of services, we'd group here. For now flat is fine or simple filter)

    return (
        <div className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {services.map((service) => (
                <div
                    key={service.id}
                    onClick={() => onBook(service)}
                    className="group bg-[#1e3a5f] border border-white/5 rounded-2xl p-4 hover:border-brand-neon-cyan/30 hover:bg-white/5 transition-all cursor-pointer flex justify-between gap-4"
                >
                    <div className="flex-1">
                        <h3 className="font-bold text-white text-base mb-1 group-hover:text-brand-neon-cyan transition-colors">
                            {service.name}
                        </h3>
                        <p className="text-slate-400 text-sm line-clamp-2 mb-3">
                            {service.description || 'Sin descripción'}
                        </p>


                    </div>

                    <div className="flex flex-col items-end justify-between shrink-0">
                        <div className="text-right">
                            <div className="text-lg font-bold text-white">
                                {service.currency} {service.price}
                            </div>
                            {service.isVariablePrice && (
                                <span className="text-[10px] text-slate-500 uppercase">Desde</span>
                            )}
                        </div>

                        <button className="w-8 h-8 rounded-full bg-brand-neon-cyan/10 flex items-center justify-center text-brand-neon-cyan group-hover:bg-brand-neon-cyan group-hover:text-black transition-colors">
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}
