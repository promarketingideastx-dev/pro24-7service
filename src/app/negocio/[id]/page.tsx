'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Lock, Award, Star, Phone, MessageSquare, Calendar } from 'lucide-react';
import PublicProfileView from '@/components/business/PublicProfileView';

export default function BusinessProfilePage() {
    const params = useParams();
    const { user, loading } = useAuth();
    const router = useRouter();
    const id = params.id as string;

    const [publicData, setPublicData] = useState<any>(null);
    const [privateData, setPrivateData] = useState<any>(null);
    const [pageLoading, setPageLoading] = useState(true);

    // Initial Load: Always get public data
    useEffect(() => {
        const loadPublic = async () => {
            try {
                const { BusinessProfileService } = await import('@/services/businessProfile.service');
                const pub = await BusinessProfileService.getPublicBusinessById(id);

                if (pub) {
                    setPublicData(pub);
                } else {
                    // Fallback to local mock if service fails/returns null
                    const { DEMO_BUSINESSES } = await import('@/data/mockBusinesses');
                    const mock = DEMO_BUSINESSES.find(b => b.id === id);
                    if (mock) {
                        setPublicData({
                            ...mock,
                            rating: 5.0,
                            reviewCount: 120,
                            coverImage: null,
                            shortDescription: mock.description,
                            fullDescription: mock.description + " (Modo Demo Local).",
                            phone: "+504 9999-9999",
                            email: "demo@local.com",
                            gallery: []
                        });
                    }
                }
            } catch (err) {
                console.error("Error loading public profile:", err);
            } finally {
                setPageLoading(false);
            }
        };
        loadPublic();
    }, [id]);

    // Private Load: Only if user exists
    useEffect(() => {
        if (user && id) {
            const loadPrivate = async () => {
                try {
                    const { BusinessProfileService } = await import('@/services/businessProfile.service');
                    const priv = await BusinessProfileService.getPrivateBusinessData(id);
                    setPrivateData(priv);
                } catch (err) {
                    console.error("Error loading private data:", err);
                }
            };
            loadPrivate();
        }
    }, [user, id]);

    if (loading || pageLoading) {
        return <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center text-slate-400">Cargando perfil...</div>;
    }

    // 1. If no public data found -> 404 (conceptually)
    if (!publicData) {
        return <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center text-white">Negocio no encontrado</div>;
    }

    // 2. If User NOT logged in -> Show Public View (Soft Gate)
    if (!user) {
        return (
            <div className="min-h-screen bg-[#0B0F19] flex flex-col justify-center">
                {/* Wrap in container or full screen */}
                <div className="max-w-2xl mx-auto w-full h-full sm:h-auto sm:border border-white/10 sm:rounded-3xl overflow-hidden shadow-2xl">
                    <PublicProfileView
                        business={publicData}
                        onLogin={() => router.push(`/auth/login?returnTo=/negocio/${id}`)}
                        onRegister={() => router.push(`/auth/register?returnTo=/negocio/${id}`)}
                    />
                </div>
            </div>
        );
    }

    // 3. User Logged In -> Show Full Profile (Combined Public + Private)
    const fullProfile = { ...publicData, ...privateData };

    return (
        <main className="min-h-screen bg-[#0B0F19] text-white pb-20">
            {/* Cover Image */}
            <div className="h-48 md:h-64 bg-slate-800 relative">
                {fullProfile.coverImage && <img src={fullProfile.coverImage} className="w-full h-full object-cover" alt="Cover" />}
                <div className="absolute inset-0 bg-black/40"></div>
                <button
                    onClick={() => router.back()}
                    className="absolute top-6 left-6 px-4 py-2 bg-black/40 backdrop-blur rounded-full text-sm font-medium hover:bg-black/60 transition-colors z-20"
                >
                    ← Volver
                </button>
            </div>

            <div className="px-6 -mt-16 relative z-10">
                {/* Profile Header */}
                <div className="flex flex-col md:flex-row items-start md:items-end gap-4 mb-8">
                    <div className="w-32 h-32 rounded-3xl bg-slate-800 border-4 border-[#0B0F19] shadow-2xl flex items-center justify-center text-4xl overflow-hidden">
                        {/* Icon or Image */}
                        {fullProfile.coverImage ? <img src={fullProfile.coverImage} className="w-full h-full object-cover" /> : '🏗️'}
                    </div>
                    <div className="flex-1">
                        <h1 className="text-3xl font-bold">{fullProfile.name}</h1>
                        <p className="text-brand-neon-cyan font-medium">{fullProfile.category} • {fullProfile.city}</p>
                        <div className="flex items-center gap-2 mt-2">
                            <span className="bg-green-500/10 text-green-400 px-2 py-0.5 rounded text-xs font-bold border border-green-500/20 flex items-center gap-1">
                                <Award className="w-3 h-3" /> VERIFICADO
                            </span>
                            <div className="flex items-center gap-1 text-yellow-400 text-sm font-bold">
                                <Star className="w-4 h-4 fill-yellow-400" /> {fullProfile.rating} ({fullProfile.reviewCount})
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content Grid (Private Data included) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                    {/* Left Column: Info */}
                    <div className="md:col-span-2 space-y-6">
                        <div className="bg-[#151b2e] rounded-3xl p-6 border border-white/5">
                            <h3 className="font-bold text-lg mb-4">Sobre Nosotros</h3>
                            <p className="text-slate-400 leading-relaxed">
                                {fullProfile.fullDescription || fullProfile.shortDescription || fullProfile.description}
                            </p>
                        </div>

                        <div className="bg-[#151b2e] rounded-3xl p-6 border border-white/5">
                            <h3 className="font-bold text-lg mb-4">Galería de Trabajos</h3>
                            {fullProfile.gallery && fullProfile.gallery.length > 0 ? (
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {fullProfile.gallery.map((img: string, i: number) => (
                                        <img key={i} src={img} className="aspect-square bg-slate-800 rounded-xl object-cover" alt={`Gallery ${i}`} />
                                    ))}
                                </div>
                            ) : (
                                <p className="text-slate-500 text-sm">No hay imágenes en la galería.</p>
                            )}
                        </div>
                    </div>

                    {/* Right Column: Actions (Sticky) */}
                    <div className="space-y-4">
                        <div className="bg-[#151b2e] rounded-3xl p-6 border border-white/5 md:sticky md:top-6">
                            <h3 className="font-bold text-lg mb-4">Contactar / Reservar</h3>

                            {/* Buttons with Real Logic would go here */}
                            <button className="w-full py-3 rounded-xl bg-brand-neon-cyan text-black font-bold mb-3 flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
                                <Calendar className="w-4 h-4" />
                                Agendar Cita
                            </button>

                            <button className="w-full py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold mb-3 flex items-center justify-center gap-2 transition-colors">
                                <MessageSquare className="w-4 h-4" />
                                Chatear
                            </button>

                            <div className="flex items-center justify-center gap-2 text-slate-400 text-sm mt-4 pt-4 border-t border-white/5">
                                <Phone className="w-4 h-4" />
                                <span>{fullProfile.phone || 'No disponible'}</span>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </main>
    );
}
