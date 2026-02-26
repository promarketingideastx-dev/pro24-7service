'use client';

import { MapPin, Phone, Globe, Clock, MessageCircle, Banknote, Building2, Wallet } from 'lucide-react';
import WeeklyScheduleView from '@/components/business/public/WeeklyScheduleView';
import OpeningHoursStatus from '@/components/business/public/OpeningHoursStatus';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';

const MapWidget = dynamic(() => import('@/components/ui/MapWidget'), {
    ssr: false,
    loading: () => <div className="h-64 w-full bg-slate-100 rounded-2xl animate-pulse" />,
});

interface DetailsTabProps {
    business: any;
}

// Simple SVG brand icons (no dependency)
const InstagramIcon = () => (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
);

const FacebookIcon = () => (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
);

const TikTokIcon = () => (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.17 8.17 0 004.78 1.52V6.78a4.85 4.85 0 01-1.01-.09z" />
    </svg>
);

export default function DetailsTab({ business }: DetailsTabProps) {
    const t = useTranslations('business.publicProfile');

    if (!business) return null;

    const social = business.socialMedia ?? {};
    const hasSocial = !!(social.instagram || social.facebook || social.tiktok);

    const normalizeUrl = (url: string, prefix: string) =>
        url.startsWith('http') ? url : `${prefix}${url}`;

    return (
        <div className="p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* About */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200">
                <h3 className="font-bold text-slate-900 text-lg mb-4 flex items-center gap-2">
                    {t('aboutUs')}
                </h3>
                <p className="text-slate-600 leading-relaxed whitespace-pre-line">
                    {business.fullDescription || business.description || t('noDescription')}
                </p>
            </div>

            {/* Contact Info */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200">
                <h3 className="font-bold text-slate-900 text-lg mb-4">{t('contactInfo')}</h3>
                <div className="space-y-4">
                    <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-[#14B8A6] shrink-0">
                            <MapPin className="w-5 h-5" />
                        </div>
                        <div>
                            <span className="block text-white font-medium mb-1">{t('location')}</span>
                            <span className="text-slate-400 text-sm">
                                {business.address ? business.address : `${business.city || ''}, ${business.department || 'Honduras'}`}
                            </span>
                        </div>
                    </div>

                    {/* MAP WIDGET INTEGRATION */}
                    <div className="h-64 w-full rounded-2xl overflow-hidden border border-slate-200 mt-4 relative z-0">
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

                    {business.phone && (() => {
                        const cleanPhone = business.phone.replace(/\D/g, '');
                        return (
                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-brand-neon-cyan shrink-0 mt-1">
                                    <Phone className="w-5 h-5" />
                                </div>
                                <div className="flex-1">
                                    <span className="block text-slate-800 font-medium mb-3">{t('phone')}</span>
                                    <div className="flex flex-wrap gap-3">
                                        {/* WhatsApp CTA */}
                                        <a
                                            href={`https://wa.me/${cleanPhone}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 hover:border-green-500/50 text-green-400 hover:text-green-300 transition-all text-sm font-medium active:scale-95"
                                        >
                                            <MessageCircle className="w-4 h-4" />
                                            <span>WhatsApp</span>
                                        </a>
                                        {/* Call CTA */}
                                        <a
                                            href={`tel:${business.phone}`}
                                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 hover:border-blue-500/50 text-blue-400 hover:text-blue-300 transition-all text-sm font-medium active:scale-95"
                                        >
                                            <Phone className="w-4 h-4" />
                                            <span>{business.phone}</span>
                                        </a>
                                    </div>
                                </div>
                            </div>
                        );
                    })()}


                    {business.website && (
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-[#14B8A6] shrink-0">
                                <Globe className="w-5 h-5" />
                            </div>
                            <div>
                                <span className="block text-slate-800 font-medium mb-1">{t('website')}</span>
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

                    {/* Social Media */}
                    {hasSocial && (
                        <div className="pt-2 border-t border-slate-200">
                            <span className="block text-slate-800 font-medium mb-3">{t('followUs')}</span>
                            <div className="flex flex-wrap gap-3">
                                {social.instagram && (
                                    <a
                                        href={normalizeUrl(social.instagram, 'https://instagram.com/')}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 hover:bg-pink-500/15 border border-slate-200 hover:border-pink-500/40 text-slate-600 hover:text-pink-500 transition-all text-sm"
                                    >
                                        <InstagramIcon />
                                        <span>{t('instagram')}</span>
                                    </a>
                                )}
                                {social.facebook && (
                                    <a
                                        href={normalizeUrl(social.facebook, 'https://facebook.com/')}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 hover:bg-blue-500/15 border border-slate-200 hover:border-blue-500/40 text-slate-600 hover:text-blue-500 transition-all text-sm"
                                    >
                                        <FacebookIcon />
                                        <span>{t('facebook')}</span>
                                    </a>
                                )}
                                {social.tiktok && (
                                    <a
                                        href={normalizeUrl(social.tiktok, 'https://tiktok.com/@')}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 text-slate-600 hover:text-slate-800 transition-all text-sm"
                                    >
                                        <TikTokIcon />
                                        <span>{t('tiktok')}</span>
                                    </a>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Payment Methods */}
            {(() => {
                const pm = business.paymentSettings;
                const hasCash = pm?.acceptsCash;
                const hasBank = pm?.acceptsBankTransfer;
                const hasWallet = pm?.acceptsDigitalWallet;
                const hasAny = hasCash || hasBank || hasWallet;
                if (!hasAny) return null;
                return (
                    <div className="bg-white rounded-3xl p-6 border border-slate-200">
                        <h3 className="font-bold text-slate-900 text-lg mb-4 flex items-center gap-2">
                            <Banknote className="w-5 h-5 text-[#14B8A6]" />
                            {t('paymentMethods')}
                        </h3>
                        <div className="flex flex-wrap gap-3">
                            {hasCash && (
                                <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm font-medium">
                                    <Banknote className="w-4 h-4" />
                                    {t('paymentCash')}
                                </div>
                            )}
                            {hasBank && (
                                <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 text-sm font-medium">
                                    <Building2 className="w-4 h-4" />
                                    {t('paymentBank')}
                                </div>
                            )}
                            {hasWallet && (
                                <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-50 border border-purple-200 text-purple-700 text-sm font-medium">
                                    <Wallet className="w-4 h-4" />
                                    {t('paymentWallet')}
                                </div>
                            )}
                        </div>
                        {hasBank && pm?.bankTransferDetails && (
                            <div className="mt-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
                                <p className="text-xs text-blue-700 font-semibold mb-1">{t('bankDetails')}</p>
                                <p className="text-xs text-blue-600 whitespace-pre-line">{pm.bankTransferDetails}</p>
                            </div>
                        )}
                        {hasWallet && pm?.digitalWalletDetails && (
                            <div className="mt-3 p-3 bg-purple-50 rounded-xl border border-purple-100">
                                <p className="text-xs text-purple-700 font-semibold mb-1">{t('walletDetails')}</p>
                                <p className="text-xs text-purple-600 whitespace-pre-line">{pm.digitalWalletDetails}</p>
                            </div>
                        )}
                        {pm?.requiresDeposit && (
                            <div className="mt-3 p-3 bg-amber-50 rounded-xl border border-amber-100">
                                <p className="text-xs text-amber-700 font-semibold">
                                    {t('requiresDeposit')}: {pm.depositType === 'percent' ? `${pm.depositValue}%` : `$${pm.depositValue}`}
                                </p>
                                {pm.depositNotes && <p className="text-xs text-amber-600 mt-0.5">{pm.depositNotes}</p>}
                            </div>
                        )}
                    </div>
                );
            })()}

            {/* Hours */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200">
                <h3 className="font-bold text-slate-900 text-lg mb-4 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-[#14B8A6]" />
                    {t('openingHours')}
                </h3>
                <div className="mb-4">
                    <OpeningHoursStatus schedule={business.openingHours} />
                </div>
                <WeeklyScheduleView schedule={business.openingHours} />
            </div>

        </div>
    );
}

