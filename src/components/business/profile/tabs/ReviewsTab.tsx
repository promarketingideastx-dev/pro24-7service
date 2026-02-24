'use client';

import { useState, useEffect } from 'react';
import { Star, MessageSquare, User, Loader2, PenTool } from 'lucide-react';
import { ReviewsService, Review } from '@/services/businessProfile.service';
import WriteReviewModal from '../../public/WriteReviewModal';
import { formatDistanceToNow } from 'date-fns';
import { es, enUS, ptBR } from 'date-fns/locale';
import { useAuth } from '@/context/AuthContext';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';

interface ReviewsTabProps {
    business: any;
}

export default function ReviewsTab({ business }: ReviewsTabProps) {
    const { user } = useAuth();
    const t = useTranslations('business.publicProfile');
    const locale = useLocale();

    // Map locale to date-fns locale
    const dateFnsLocale = locale === 'en' ? enUS : locale === 'pt-BR' ? ptBR : es;

    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Local state for immediate UI updates on new review
    const [rating, setRating] = useState(business.rating || 0);
    const [count, setCount] = useState(business.reviewCount || 0);

    useEffect(() => {
        loadReviews();
    }, [business.id]);

    const loadReviews = async () => {
        if (!business.id) return;
        try {
            const data = await ReviewsService.getReviews(business.id);
            setReviews(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleWriteReview = () => {
        if (!user) {
            toast.error(t('loginToReview'));
            return;
        }
        setIsModalOpen(true);
    };

    const handleReviewSuccess = () => {
        loadReviews();
        setCount((prev: number) => prev + 1);
        toast.success(t('reviewPublished'));
    };

    return (
        <div className="p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* Modal */}
            {isModalOpen && (
                <WriteReviewModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSuccess={handleReviewSuccess}
                    businessId={business.id}
                    businessName={business.name}
                />
            )}

            {/* Summary Card */}
            <div className="bg-white rounded-3xl p-8 border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-8 mb-8">

                {/* Left: Rating */}
                <div className="flex flex-col items-center md:items-start">
                    <h3 className="text-slate-400 font-medium uppercase tracking-widest text-xs mb-4">{t('overallRating')}</h3>
                    <div className="flex items-center gap-4 mb-2">
                        <span className="text-6xl font-bold text-white">{rating}</span>
                        <div className="flex flex-col items-start">
                            <div className="flex gap-1 mb-1">
                                {[1, 2, 3, 4, 5].map((s) => (
                                    <Star key={s} className={`w-5 h-5 ${s <= Math.round(rating) ? 'text-yellow-400 fill-yellow-400' : 'text-slate-700'}`} />
                                ))}
                            </div>
                            <span className="text-slate-400 text-sm">{count} {t('verifiedReviews')}</span>
                        </div>
                    </div>
                </div>

                {/* Right: CTA */}
                <div className="flex flex-col items-center md:items-end gap-2 text-center md:text-right">
                    <button
                        onClick={handleWriteReview}
                        className="bg-brand-neon-cyan hover:bg-cyan-400 text-black px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-cyan-500/20"
                    >
                        <PenTool size={18} />
                        {t('writeReview')}
                    </button>
                    <span className="text-xs text-slate-500">{t('shareExperience')}</span>
                </div>
            </div>

            {/* Review List */}
            <div className="space-y-4">
                {loading ? (
                    <div className="flex justify-center p-12 text-slate-500">
                        <Loader2 className="animate-spin w-8 h-8" />
                    </div>
                ) : reviews.length === 0 ? (
                    <div className="text-center p-12 bg-slate-50 rounded-2xl border border-slate-200 border-dashed">
                        <MessageSquare className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                        <h4 className="text-white font-medium text-lg">{t('noReviews')}</h4>
                        <p className="text-slate-400 text-sm mt-1">{t('beFirstReview')}</p>
                    </div>
                ) : (
                    reviews.map((review) => (
                        <div key={review.id} className="bg-white p-6 rounded-2xl border border-slate-200 flex gap-4 transition-all hover:bg-slate-50">
                            {/* Avatar */}
                            <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-700 shrink-0 border border-slate-200">
                                {review.userAvatar ? (
                                    <img src={review.userAvatar} alt={review.userName} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                                        <User size={20} />
                                    </div>
                                )}
                            </div>

                            {/* Content */}
                            <div className="flex-1">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <h4 className="font-bold text-white text-sm">{review.userName}</h4>
                                        <div className="flex gap-1 mt-1">
                                            {[1, 2, 3, 4, 5].map((s) => (
                                                <Star key={s} size={12} className={`${s <= review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-slate-700'}`} />
                                            ))}
                                        </div>
                                    </div>
                                    <span className="text-xs text-slate-500">
                                        {review.createdAt
                                            ? formatDistanceToNow(review.createdAt.toDate(), { locale: dateFnsLocale, addSuffix: true })
                                            : t('recent')}
                                    </span>
                                </div>

                                <p className="text-slate-300 text-sm leading-relaxed">
                                    {review.comment}
                                </p>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
