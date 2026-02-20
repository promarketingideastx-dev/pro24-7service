import { MapPin, Star, Lock, Phone, MessageSquare, UserPlus, LogIn, Globe, Calendar } from 'lucide-react';
import OpeningHoursStatus from './public/OpeningHoursStatus';
import WeeklyScheduleView from './public/WeeklyScheduleView';
import RequestAppointmentModal from '@/components/public/RequestAppointmentModal';
import { useState } from 'react';

interface PublicProfileViewProps {
    business: any;
    onLogin: () => void;
    onRegister: () => void;
}

export default function PublicProfileView({ business, onLogin, onRegister }: PublicProfileViewProps) {
    const [isBookingOpen, setIsBookingOpen] = useState(false);

    if (!business) return null;

    return (
        <div className="flex flex-col h-full bg-[#1e3a5f] text-white">

            {/* Cover Image & Header */}
            <div className="relative h-48 sm:h-56 shrink-0 w-full">
                {business.coverImage ? (
                    <img src={business.coverImage} alt={business.name} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                        <span className="text-4xl">🏢</span>
                    </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#1e3a5f] via-transparent to-transparent"></div>

                <div className="absolute bottom-4 left-6 right-6">
                    <div className="flex items-start justify-between">
                        <div>
                            <h2 className="text-2xl font-bold text-white mb-1 shadow-black drop-shadow-md">{business.name}</h2>
                            <p className="text-brand-neon-cyan font-medium text-sm flex items-center gap-1 shadow-black drop-shadow-md">
                                {business.category} • {business.subcategory}
                            </p>
                        </div>
                        <div className="flex flex-col items-end">
                            <div className="flex items-center gap-1 bg-black/40 backdrop-blur px-2 py-1 rounded-lg border border-white/10">
                                <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                                <span className="text-white font-bold text-sm">{business.rating || '5.0'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Scroll */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">

                {/* Basic Info (Public) */}
                <div className="flex flex-col gap-2 text-slate-300 text-sm">
                    <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-slate-500" />
                        <span>{business.city || 'Ubicación no especificada'}, Honduras</span>
                    </div>
                    {/* Website Link (Added) */}
                    {business.website && (
                        <div className="flex items-center gap-2">
                            <Globe className="w-4 h-4 text-slate-500" />
                            <a
                                href={!business.website.startsWith('http') ? `https://${business.website}` : business.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-brand-neon-cyan hover:underline"
                            >
                                {business.website}
                            </a>
                        </div>
                    )}
                </div>

                {/* Description (Teaser) */}
                <div>
                    <h3 className="text-white font-bold mb-2 text-sm uppercase tracking-wider text-slate-500">Sobre Nosotros</h3>
                    <p className="text-slate-300 leading-relaxed text-sm">
                        {(business.shortDescription || business.description || '').substring(0, 100)}...
                        <span className="text-brand-neon-cyan cursor-pointer hover:underline ml-1" onClick={onRegister}>Ver más</span>
                    </p>
                </div>

                {/* Opening Hours & Status */}
                <div className="space-y-4">
                    <OpeningHoursStatus schedule={business.openingHours} />
                    <WeeklyScheduleView schedule={business.openingHours} />
                </div>

                {/* Booking Teaser / Action */}
                <div className="bg-gradient-to-r from-brand-neon-cyan/10 to-brand-neon-purple/10 border border-brand-neon-cyan/20 rounded-2xl p-6 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-brand-neon-cyan/20 blur-3xl rounded-full -mr-16 -mt-16"></div>
                    <div className="relative z-10">
                        <h3 className="text-white font-bold text-lg mb-2 flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-brand-neon-cyan" />
                            Reserva tu Cita Online
                        </h3>
                        <p className="text-slate-300 text-sm mb-4">
                            Selecciona el servicio y horario que prefieras sin esperas.
                        </p>
                        <button
                            onClick={() => setIsBookingOpen(true)}
                            className="w-full py-3 bg-brand-neon-cyan text-black font-bold rounded-xl shadow-[0_0_15px_rgba(0,240,255,0.3)] hover:shadow-[0_0_20px_rgba(0,240,255,0.5)] hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                        >
                            Reservar Ahora
                        </button>
                    </div>
                </div>

                {/* Gallery Teaser */}
                <div className="relative group cursor-pointer" onClick={onRegister}>
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="text-white font-bold text-sm uppercase tracking-wider text-slate-500">Galería de Trabajos</h3>
                        <Lock className="w-3 h-3 text-slate-500" />
                    </div>
                    <div className="grid grid-cols-3 gap-2 opacity-30 blur-[4px] pointer-events-none select-none grayscale">
                        <div className="aspect-square bg-slate-700 rounded-lg"></div>
                        <div className="aspect-square bg-slate-700 rounded-lg"></div>
                        <div className="aspect-square bg-slate-700 rounded-lg"></div>
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 flex items-center gap-2 text-xs font-bold text-white shadow-xl hover:scale-105 transition-transform">
                            <span className="w-2 h-2 rounded-full bg-brand-neon-cyan animate-pulse"></span>
                            Ver Fotos y Reseñas
                        </div>
                    </div>
                </div>

            </div>

            {/* Footer Actions (Sticky) */}
            <div className="p-6 border-t border-white/5 bg-[#0f172a] space-y-3">
                <button
                    onClick={() => setIsBookingOpen(true)}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-brand-neon-cyan to-brand-neon-purple text-black font-bold text-sm shadow-lg hover:shadow-cyan-500/20 transition-all flex items-center justify-center gap-2"
                >
                    <Calendar className="w-4 h-4" />
                    Agendar Cita
                </button>
                <button
                    onClick={onLogin}
                    className="w-full py-3.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-medium text-sm transition-colors flex items-center justify-center gap-2"
                >
                    <LogIn className="w-4 h-4" />
                    Soy Cliente (Login)
                </button>
            </div>

            <RequestAppointmentModal
                isOpen={isBookingOpen}
                onClose={() => setIsBookingOpen(false)}
                businessId={business.id}
                businessName={business.name}
                openingHours={business.openingHours}
            />

        </div>
    );
}
