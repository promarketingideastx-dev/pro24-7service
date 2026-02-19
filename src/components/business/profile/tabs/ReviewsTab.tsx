'use client';

import { Star, MessageSquare } from 'lucide-react';

interface ReviewsTabProps {
    business: any;
}

export default function ReviewsTab({ business }: ReviewsTabProps) {
    const rating = business.rating || 5.0;
    const count = business.reviewCount || 0;

    return (
        <div className="p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* Summary Card */}
            <div className="bg-[#151b2e] rounded-3xl p-8 border border-white/5 flex flex-col items-center justify-center text-center mb-8">
                <h3 className="text-slate-400 font-medium uppercase tracking-widest text-xs mb-4">Valoración General</h3>

                <div className="flex items-center gap-4 mb-2">
                    <span className="text-6xl font-bold text-white">{rating}</span>
                    <div className="flex flex-col items-start">
                        <div className="flex gap-1 mb-1">
                            {[1, 2, 3, 4, 5].map((s) => (
                                <Star key={s} className={`w-5 h-5 ${s <= Math.round(rating) ? 'text-yellow-400 fill-yellow-400' : 'text-slate-700'}`} />
                            ))}
                        </div>
                        <span className="text-slate-400 text-sm">{count} Reseñas Verificadas</span>
                    </div>
                </div>
            </div>

            {/* Placeholder List */}
            <div className="space-y-4 opacity-50 pointer-events-none grayscale">
                <div className="bg-[#151b2e] p-4 rounded-xl border border-white/5 flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-slate-700"></div>
                    <div className="flex-1">
                        <div className="h-4 bg-slate-700 w-32 mb-2 rounded"></div>
                        <div className="h-3 bg-slate-700 w-full mb-1 rounded"></div>
                        <div className="h-3 bg-slate-700 w-2/3 rounded"></div>
                    </div>
                </div>
                <div className="bg-[#151b2e] p-4 rounded-xl border border-white/5 flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-slate-700"></div>
                    <div className="flex-1">
                        <div className="h-4 bg-slate-700 w-32 mb-2 rounded"></div>
                        <div className="h-3 bg-slate-700 w-full mb-1 rounded"></div>
                        <div className="h-3 bg-slate-700 w-2/3 rounded"></div>
                    </div>
                </div>
            </div>

            <div className="mt-8 text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-neon-cyan/10 text-brand-neon-cyan text-sm font-bold">
                    <MessageSquare className="w-4 h-4" />
                    Sistema de reseñas detalladas próximamente
                </div>
            </div>
        </div>
    );
}
