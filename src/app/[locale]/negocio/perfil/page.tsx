'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Lock, Award, Star, Phone, MessageSquare, Calendar } from 'lucide-react';
// import PublicProfileView from '@/components/business/PublicProfileView'; // Deprecated
import { useCuriousMode } from '@/hooks/useCuriousMode';
import CuriousModeModal from '@/components/public/CuriousModeModal';
import RequestAppointmentModal from '@/components/public/RequestAppointmentModal';
import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';

import BusinessProfileLayout from '@/components/business/profile/BusinessProfileLayout';
import ServicesTab from '@/components/business/profile/tabs/ServicesTab';
import GalleryTab from '@/components/business/profile/tabs/GalleryTab';
import ReviewsTab from '@/components/business/profile/tabs/ReviewsTab';
import DetailsTab from '@/components/business/profile/tabs/DetailsTab';
import TeamTab from '@/components/business/profile/tabs/TeamTab';
import AppInstallBanner from '@/components/ui/AppInstallBanner';
import ChatModal from '@/components/ui/ChatModal';
import { PlanService } from '@/services/plan.service';
import { AnalyticsService } from '@/services/analytics.service';


function BusinessProfileContent() {
    const searchParams = useSearchParams();
    const { user, loading } = useAuth();
    const router = useRouter();
    const id = searchParams.get('id') as string;

    const [publicData, setPublicData] = useState<any>(null);
    const [privateData, setPrivateData] = useState<any>(null);
    const [pageLoading, setPageLoading] = useState(true);
    const [error, setError] = useState(false);
    const [isBookingOpen, setIsBookingOpen] = useState(false);

    // UI State
    const [activeTab, setActiveTab] = useState('services');
    const [isChatOpen, setIsChatOpen] = useState(false);

    const tCurious = useTranslations('curiousMode');
    const locale = useLocale();

    // 1. Hooks MUST be at the top unconditionally
    // Prevent Curious Mode from counting 404s or loading states by only passing ID when public data exists
    const validBusinessId = publicData ? id : null;
    const { visits, maxVisits, isBlocked, isInitialized } = useCuriousMode(validBusinessId, publicData?.country || '');
    const isOwner = user?.uid === id;
    const displayData = isOwner && privateData ? { ...publicData, ...privateData } : publicData;

    // Initial Load: Always get public data
    const loadPublic = async () => {
        setPageLoading(true);
        setError(false);
        try {
            const { BusinessProfileService } = await import('@/services/businessProfile.service');
            const pub = await BusinessProfileService.getPublicBusinessById(id);

            if (pub) {
                setPublicData(pub);
                // ── Track profile view (fire and forget) ──
                AnalyticsService.track({
                    type: 'profile_view',
                    businessId: id,
                    userUid: user?.uid,
                    country: (pub as any).country ?? (pub as any).location?.country ?? undefined,
                    deviceType: window.innerWidth < 768 ? 'mobile' : window.innerWidth < 1024 ? 'tablet' : 'desktop',
                });
            } else {
                // Not found (404)
                setPublicData(null);
            }
        } catch (err) {
            console.error("Error loading public profile:", err);
            setError(true);
        } finally {
            setPageLoading(false);
        }
    };

    useEffect(() => {
        if (!id) {
            setPageLoading(false);
            return;
        }
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
        return <div className="min-h-screen bg-[#F4F6F8] flex items-center justify-center text-slate-400">Cargando perfil...</div>;
    }

    // 0. Invalid ID
    if (!id) {
        return <div className="min-h-screen bg-[#F4F6F8] flex items-center justify-center text-slate-600 font-bold text-lg">Negocio no encontrado</div>;
    }

    // 1. Error State
    if (error) {
        return (
            <div className="min-h-screen bg-[#F4F6F8] flex flex-col items-center justify-center text-slate-900 gap-4">
                <p className="text-red-400">Ocurrió un error al cargar el negocio.</p>
                <button
                    onClick={loadPublic}
                    className="px-4 py-2 bg-slate-100 rounded-lg hover:bg-slate-100 transition-colors"
                >
                    Reintentar
                </button>
            </div>
        );
    }

    // 2. If no public data found -> 404 (Real 404, no mocks)
    if (!publicData) {
        return <div className="min-h-screen bg-[#F4F6F8] flex items-center justify-center text-slate-600">Negocio no encontrado</div>;
    }

    // 3. Curious Mode Analytics (No longer blocks access)
    // Prevent FOUC: wait until localStorage is read before rendering public data
    if (!isInitialized) {
        return <div className="min-h-screen bg-[#F4F6F8]"></div>;
    }

    // 4. Unified "Mini-App" View for ALL users (Guest & Logged In)
    // (State moved to top)

    // Determine if team tab should be shown
    const effectivePlan = PlanService.getEffectivePlan(displayData || {});
    const showTeamTab = PlanService.canUseTeam(effectivePlan);
    const isUnavailable = PlanService.isPlanExpired(displayData?.planData);

    return (
        <>
            <BusinessProfileLayout
                business={displayData}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                isOwner={isOwner}
                onBookClick={() => {
                    setIsBookingOpen(true);
                    AnalyticsService.track({ type: 'booking_modal_open', businessId: id, userUid: user?.uid });
                }}
                isModalOpen={isBookingOpen}
                showTeamTab={showTeamTab}
                isUnavailable={isUnavailable}
            >
                {activeTab === 'services' && (
                    <ServicesTab
                        businessId={id}
                        services={displayData.services}
                        rating={displayData.rating}
                        reviewCount={displayData.reviewCount}
                        onBook={(service) => {
                            setIsBookingOpen(true);
                        }}
                    />
                )}

                {activeTab === 'gallery' && (
                    <GalleryTab businessId={id} images={displayData.gallery || displayData.images || []} />
                )}

                {activeTab === 'reviews' && (
                    <ReviewsTab
                        business={displayData}
                        onRatingUpdate={(rating, count) => {
                            setPublicData((prev: any) => prev ? { ...prev, rating, reviewCount: count } : prev);
                        }}
                    />
                )}

                {activeTab === 'details' && (
                    <DetailsTab business={displayData} />
                )}

                {activeTab === 'team' && showTeamTab && (
                    <TeamTab businessId={id} />
                )}

                <RequestAppointmentModal
                    isOpen={isBookingOpen}
                    onClose={() => setIsBookingOpen(false)}
                    businessId={id}
                    businessName={displayData.name}
                    openingHours={displayData.openingHours}
                    paymentSettings={displayData.paymentSettings}
                    bookingSettings={displayData.bookingSettings}
                />

                {/* App Install Banner — shows to mobile visitors who don't have the app */}
                {!isOwner && <AppInstallBanner businessName={displayData.name} />}

                {/* Floating Chat Button — visible to logged-in clients (not the owner) */}
                {user && !isOwner && !isUnavailable && (
                    <button
                        onClick={() => setIsChatOpen(true)}
                        className="fixed bottom-24 right-5 z-[200] w-14 h-14 rounded-full bg-[#14B8A6] hover:bg-[#0F9488] shadow-[0_4px_20px_rgba(20,184,166,0.45)] flex items-center justify-center text-white transition-all hover:scale-110 active:scale-95"
                        title="Chatear con el negocio"
                    >
                        <MessageSquare className="w-6 h-6" />
                    </button>
                )}

                {/* Chat Modal */}
                <ChatModal
                    isOpen={isChatOpen}
                    onClose={() => setIsChatOpen(false)}
                    businessId={id}
                    businessName={displayData?.name || 'Negocio'}
                />
            </BusinessProfileLayout>
        </>
    );
}

export default function BusinessProfilePage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-[#F4F6F8] flex items-center justify-center text-slate-400">Cargando perfil...</div>}>
            <BusinessProfileContent />
        </Suspense>
    );
}
