'use client';

import { MapPin, Phone, Globe, Clock, Mail } from 'lucide-react';
import WeeklyScheduleView from '@/components/business/public/WeeklyScheduleView';
import OpeningHoursStatus from '@/components/business/public/OpeningHoursStatus';
import dynamic from 'next/dynamic';

const MapWidget = dynamic(() => import('@/components/ui/MapWidget'), {
    ssr: false,
    loading: () => <div className="h-64 w-full bg-slate-900 rounded-2xl animate-pulse" />
});
interface DetailsTabProps {
    business: any;
}

export default function DetailsTab({ business }: DetailsTabProps) {
    if (!business) return null;

    return (
        <div className="p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* About */}
            <div className="bg-[#1e5555] rounded-3xl p-6 border border-white/5">
                <h3 className="font-bold text-white text-lg mb-4 flex items-center gap-2">
                    Sobre Nosotros
                </h3>
                <p className="text-slate-300 leading-relaxed whitespace-pre-line">
                    {business.fullDescription || business.description || 'Sin descripción disponible.'}
                </p>
            </div>

            {/* Contact Info */}
            <div className="bg-[#1e5555] rounded-3xl p-6 border border-white/5">
                <h3 className="font-bold text-white text-lg mb-4">Información de Contacto</h3>
                <div className="space-y-4">
                    <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-brand-neon-cyan shrink-0">
                            <MapPin className="w-5 h-5" />
                        </div>
                        <div>
                            <span className="block text-white font-medium mb-1">Ubicación</span>
                            <span className="text-slate-400 text-sm">
                                {business.address ? business.address : `${business.city || ''}, ${business.department || 'Honduras'}`}
                            </span>
                        </div>
                    </div>

                    {/* MAP WIDGET INTEGRATION */}
                    <div className="h-64 w-full rounded-2xl overflow-hidden border border-white/10 mt-4 relative z-0">
                        <MapWidget
                            businesses={[{
                                id: business.id || 'preview',
                                name: business.name,
                                category: business.category,
                                subcategory: business.subcategory || '',
                                tags: business.tags || [],
                                lat: business.lat || business.location?.lat || 15.50417,
                                lng: business.lng || business.location?.lng || -88.02500,
                                icon: '📍',
                                color: 'bg-brand-neon-cyan',
                                description: business.description || '',
                                countryCode: business.country || 'HN'
                            }]}
                        />
                    </div>

                    {business.phone && (
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-brand-neon-cyan shrink-0">
                                <Phone className="w-5 h-5" />
                            </div>
                            <div>
                                <span className="block text-white font-medium mb-1">Teléfono</span>
                                <a href={`tel:${business.phone}`} className="text-slate-400 text-sm hover:text-white transition-colors">
                                    {business.phone}
                                </a>
                            </div>
                        </div>
                    )}

                    {business.website && (
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-brand-neon-cyan shrink-0">
                                <Globe className="w-5 h-5" />
                            </div>
                            <div>
                                <span className="block text-white font-medium mb-1">Sitio Web</span>
                                <a
                                    href={!business.website.startsWith('http') ? `https://${business.website}` : business.website}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-brand-neon-cyan text-sm hover:underline"
                                >
                                    {business.website}
                                </a>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Hours */}
            <div className="bg-[#1e5555] rounded-3xl p-6 border border-white/5">
                <h3 className="font-bold text-white text-lg mb-4 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-brand-neon-cyan" />
                    Horarios de Atención
                </h3>
                <div className="mb-4">
                    <OpeningHoursStatus schedule={business.openingHours} />
                </div>
                <WeeklyScheduleView schedule={business.openingHours} />
            </div>

        </div>
    );
}
