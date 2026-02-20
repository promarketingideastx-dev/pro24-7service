'use client';

import { useState } from 'react';
import { X, Star, Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';
import { ReviewsService } from '@/services/businessProfile.service';
import { useAuth } from '@/context/AuthContext';

interface WriteReviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    businessId: string;
    businessName: string;
}

export default function WriteReviewModal({ isOpen, onClose, onSuccess, businessId, businessName }: WriteReviewModalProps) {
    const { user, userProfile } = useAuth();
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [hoveredStar, setHoveredStar] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async () => {
        if (!user) {
            toast.error("Debes iniciar sesión para escribir una reseña");
            return;
        }

        if (rating === 0) {
            toast.error("Por favor selecciona una calificación");
            return;
        }

        if (comment.trim().length < 10) {
            toast.error("Tu comentario es muy corto (mínimo 10 caracteres)");
            return;
        }

        setIsSubmitting(true);

        try {
            await ReviewsService.addReview(businessId, {
                userId: user.uid,
                userName: userProfile?.displayName || userProfile?.clientProfile?.fullName || 'Usuario',
                userAvatar: userProfile?.clientProfile?.avatar?.photo_url || user.photoURL || undefined,
                rating,
                comment,
                createdAt: null // Service adds serverTimestamp
            });

            toast.success("¡Gracias por tu reseña!");
            onSuccess();
            onClose();
        } catch (error) {
            console.error("Error submitting review:", error);
            toast.error("Error al publicar reseña. Intenta de nuevo.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                onClick={onClose}
            ></div>

            {/* Modal */}
            <div className="relative w-full max-w-lg bg-[#1e5555] rounded-2xl border border-white/10 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/5">
                    <h3 className="text-xl font-bold text-white">Calificar a {businessName}</h3>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-white/5 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">

                    {/* Star Rating */}
                    <div className="flex flex-col items-center gap-3">
                        <span className="text-sm font-medium text-slate-400 uppercase tracking-wider">
                            Tu Calificación
                        </span>
                        <div className="flex gap-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    type="button"
                                    onClick={() => setRating(star)}
                                    onMouseEnter={() => setHoveredStar(star)}
                                    onMouseLeave={() => setHoveredStar(0)}
                                    className="p-1 transition-transform hover:scale-110 focus:outline-none"
                                >
                                    <Star
                                        size={32}
                                        className={`transition-colors ${star <= (hoveredStar || rating)
                                                ? 'fill-yellow-400 text-yellow-400'
                                                : 'text-slate-600'
                                            }`}
                                    />
                                </button>
                            ))}
                        </div>
                        <span className="text-sm text-brand-neon-cyan h-5 min-h-[1.25rem]">
                            {hoveredStar === 1 && "Malo"}
                            {hoveredStar === 2 && "Regular"}
                            {hoveredStar === 3 && "Bueno"}
                            {hoveredStar === 4 && "Muy Bueno"}
                            {hoveredStar === 5 && "Excelente"}
                        </span>
                    </div>

                    {/* Comment */}
                    <div className="space-y-2">
                        <label className="text-sm text-slate-300 font-medium">
                            Cuéntanos tu experiencia
                        </label>
                        <textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="¿Qué te pareció el servicio? ¿Lo recomendarías?"
                            className="w-full bg-slate-900/50 border border-white/10 rounded-xl p-4 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-neon-cyan/50 resize-none h-32"
                        />
                        <div className="flex justify-end">
                            <span className={`text-xs ${comment.length > 0 && comment.length < 10 ? 'text-red-400' : 'text-slate-500'}`}>
                                {comment.length} / 10 caracteres mínimos
                            </span>
                        </div>
                    </div>

                </div>

                {/* Footer */}
                <div className="p-6 border-t border-white/5 bg-black/20 flex gap-3 justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-slate-300 hover:text-white font-medium transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting || rating === 0 || comment.length < 10}
                        className="px-6 py-2 bg-brand-neon-cyan text-black font-bold rounded-lg hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
                    >
                        {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                        Publicar Reseña
                    </button>
                </div>

            </div>
        </div>
    );
}
