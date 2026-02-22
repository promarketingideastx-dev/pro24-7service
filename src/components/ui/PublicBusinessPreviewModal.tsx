import { X, MapPin, Star, Calendar, MessageSquare, Phone, Lock, ChevronRight, UserPlus, LogIn } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';

interface PublicBusinessPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    business: any; // Using any for flexibility with Mock/Firestore data for now
}

export default function PublicBusinessPreviewModal({ isOpen, onClose, business }: PublicBusinessPreviewModalProps) {
    const router = useRouter();
    const locale = useLocale();
    const lp = (path: string) => `/${locale}${path}`;

    if (!isOpen || !business) return null;

    const returnUrl = `/negocio/${business.id}`;

    const handleLogin = () => {
        router.push(lp(`/auth/login?returnTo=${encodeURIComponent(returnUrl)}`));
    };

    const handleRegister = () => {
        router.push(lp(`/auth/register?returnTo=${encodeURIComponent(returnUrl)}`));
    };

    return (
        <div className="fixed inset-0 z-[3000] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm sm:p-4 animate-in fade-in duration-200">
            {/* Click outside to close */}
            <div className="absolute inset-0" onClick={onClose}></div>

            <div className="relative bg-[#151b2e] w-full max-w-lg sm:rounded-3xl rounded-t-3xl border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] sm:max-h-[85vh] animate-in slide-in-from-bottom duration-300">

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-20 p-2 rounded-full bg-black/20 hover:bg-black/40 text-white backdrop-blur transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Cover Image & Header */}
                <div className="relative h-48 sm:h-56 shrink-0">
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
                <div className="overflow-y-auto p-6 space-y-8 custom-scrollbar">

                    {/* Basic Info (Public) */}
                    <div className="flex items-center gap-2 text-slate-300 text-sm">
                        <MapPin className="w-4 h-4 text-slate-500" />
                        <span>{business.city || 'Ubicación no especificada'}, Honduras</span>
                    </div>

                    {/* Description (Teaser) */}
                    <div>
                        <h3 className="text-white font-bold mb-2 text-sm uppercase tracking-wider text-slate-500">Sobre Nosotros</h3>
                        <p className="text-slate-300 leading-relaxed text-sm">
                            {(business.description || '').substring(0, 100)}...
                            <span className="text-brand-neon-cyan cursor-pointer hover:underline ml-1" onClick={handleRegister}>Ver más</span>
                        </p>
                    </div>

                    {/* TEASER SECTIONS (BLURRED) */}

                    {/* Gallery Teaser */}
                    <div className="relative group cursor-pointer" onClick={handleRegister}>
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="text-white font-bold text-sm uppercase tracking-wider text-slate-500">Galería de Trabajos</h3>
                            <Lock className="w-3 h-3 text-slate-500" />
                        </div>
                        <div className="grid grid-cols-3 gap-2 opacity-50 blur-[2px] pointer-events-none select-none">
                            <div className="aspect-square bg-slate-700 rounded-lg"></div>
                            <div className="aspect-square bg-slate-700 rounded-lg"></div>
                            <div className="aspect-square bg-slate-700 rounded-lg"></div>
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 flex items-center gap-2 text-xs font-bold text-white shadow-xl">
                                <span className="w-2 h-2 rounded-full bg-brand-neon-cyan animate-pulse"></span>
                                Ver 12 Fotos
                            </div>
                        </div>
                    </div>

                    {/* Contact Teaser */}
                    <div className="relative group cursor-pointer" onClick={handleRegister}>
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="text-white font-bold text-sm uppercase tracking-wider text-slate-500">Contacto Directo</h3>
                            <Lock className="w-3 h-3 text-slate-500" />
                        </div>
                        <div className="space-y-3 opacity-50 blur-[1px] pointer-events-none select-none">
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
                            <div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 flex items-center gap-2 text-xs font-bold text-white shadow-xl">
                                Contactar Ahora
                            </div>
                        </div>
                    </div>

                </div>

                {/* Footer Actions (Sticky) */}
                <div className="p-6 border-t border-white/5 bg-[#0f172a] space-y-3">
                    <button
                        onClick={handleRegister}
                        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-sm shadow-lg hover:shadow-cyan-500/20 transition-all flex items-center justify-center gap-2"
                    >
                        <UserPlus className="w-4 h-4" />
                        Crear Cuenta Gratis y Contactar
                    </button>
                    <button
                        onClick={handleLogin}
                        className="w-full py-3.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-medium text-sm transition-colors flex items-center justify-center gap-2"
                    >
                        <LogIn className="w-4 h-4" />
                        Ya tengo cuenta, iniciar sesión
                    </button>
                    <p className="text-center text-[10px] text-slate-500">
                        Acceso inmediato a contacto y galería completa.
                    </p>
                </div>

            </div>
        </div>
    );
}
