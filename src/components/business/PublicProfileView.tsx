import { MapPin, Star, Lock, Phone, MessageSquare, UserPlus, LogIn } from 'lucide-react';

interface PublicProfileViewProps {
    business: any;
    onLogin: () => void;
    onRegister: () => void;
}

export default function PublicProfileView({ business, onLogin, onRegister }: PublicProfileViewProps) {
    if (!business) return null;

    return (
        <div className="flex flex-col h-full bg-[#151b2e] text-white">

            {/* Cover Image & Header */}
            <div className="relative h-48 sm:h-56 shrink-0 w-full">
                {business.coverImage ? (
                    <img src={business.coverImage} alt={business.name} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                        <span className="text-4xl">🏢</span>
                    </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#151b2e] via-transparent to-transparent"></div>

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
                <div className="flex items-center gap-2 text-slate-300 text-sm">
                    <MapPin className="w-4 h-4 text-slate-500" />
                    <span>{business.city || 'Ubicación no especificada'}, Honduras</span>
                </div>

                {/* Description (Teaser) */}
                <div>
                    <h3 className="text-white font-bold mb-2 text-sm uppercase tracking-wider text-slate-500">Sobre Nosotros</h3>
                    <p className="text-slate-300 leading-relaxed text-sm">
                        {(business.shortDescription || business.description || '').substring(0, 100)}...
                        <span className="text-brand-neon-cyan cursor-pointer hover:underline ml-1" onClick={onRegister}>Ver más</span>
                    </p>
                </div>

                {/* TEASER SECTIONS (BLURRED) */}

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

                {/* Contact Teaser */}
                <div className="relative group cursor-pointer" onClick={onRegister}>
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="text-white font-bold text-sm uppercase tracking-wider text-slate-500">Contacto Directo</h3>
                        <Lock className="w-3 h-3 text-slate-500" />
                    </div>
                    <div className="space-y-3 opacity-30 blur-[3px] pointer-events-none select-none grayscale">
                        <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
                            <Phone className="w-4 h-4 text-slate-400" />
                            <span className="text-slate-400 text-sm">+504 9999-****</span>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
                            <MessageSquare className="w-4 h-4 text-slate-400" />
                            <span className="text-slate-400 text-sm">Chatear con {business.name}</span>
                        </div>
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 flex items-center gap-2 text-xs font-bold text-white shadow-xl hover:scale-105 transition-transform">
                            Contactar Ahora
                        </div>
                    </div>
                </div>

            </div>

            {/* Footer Actions (Sticky) */}
            <div className="p-6 border-t border-white/5 bg-[#0f172a] space-y-3">
                <button
                    onClick={onRegister}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-sm shadow-lg hover:shadow-cyan-500/20 transition-all flex items-center justify-center gap-2"
                >
                    <UserPlus className="w-4 h-4" />
                    Crear Cuenta Gratis y Contactar
                </button>
                <button
                    onClick={onLogin}
                    className="w-full py-3.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-medium text-sm transition-colors flex items-center justify-center gap-2"
                >
                    <LogIn className="w-4 h-4" />
                    Ya tengo cuenta, iniciar sesión
                </button>
            </div>

        </div>
    );
}
