'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTranslations, useLocale } from 'next-intl';
import { CheckCircle2, Zap, Users, Crown, ExternalLink, Loader2, AlertCircle, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { StripeService } from '@/services/stripe.service';

// ─── Plan definitions ─────────────────────────────────────────────────────────
const PLANS = [
    {
        id: 'free' as const,
        nameKey: 'planFree',
        price: 0,
        icon: '🆓',
        color: 'slate',
        features: ['featureFreeProfile', 'featureFreeBooking', 'featureFreeBasic'],
    },
    {
        id: 'premium' as const,
        nameKey: 'planPremium',
        price: 9.99,
        icon: '⚡',
        color: 'teal',
        popular: true,
        features: ['featurePremiumAll', 'featurePremiumGallery', 'featurePremiumAnalytics', 'featurePremiumNotifications'],
    },
    {
        id: 'plus_team' as const,
        nameKey: 'planPlusTeam',
        price: 14.99,
        icon: '👥',
        color: 'violet',
        features: ['featurePlusAll', 'featurePlusTeam5', 'featurePlusAssign', 'featurePlusCalendar'],
    },
];

interface SubscriptionPanelProps {
    currentPlan: string;
    businessId: string;
}

export default function SubscriptionPanel({ currentPlan, businessId }: SubscriptionPanelProps) {
    const { user } = useAuth();
    const t = useTranslations('subscription');
    const locale = useLocale();
    const router = useRouter();
    const [loading, setLoading] = useState<string | null>(null);
    const [hasStripeCustomer, setHasStripeCustomer] = useState(false);
    const [stripeConfigured] = useState(() =>
        !!(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY &&
            !process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.includes('placeholder'))
    );

    useEffect(() => {
        if (businessId) {
            StripeService.getStripeCustomerId(businessId).then(id => {
                setHasStripeCustomer(!!id);
            });
        }
    }, [businessId]);

    const handleUpgrade = async (planId: 'premium' | 'plus_team') => {
        if (!stripeConfigured) {
            toast.error(t('stripeNotConfigured'), { description: t('stripeNotConfiguredDesc') });
            return;
        }

        setLoading(planId);
        try {
            const baseUrl = window.location.origin;
            const res = await fetch('/api/stripe/create-checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    businessId,
                    plan: planId,
                    successUrl: `${baseUrl}/${locale}/business/dashboard/settings/payments`,
                    cancelUrl: `${baseUrl}/${locale}/business/dashboard/settings/payments`,
                }),
            });
            const data = await res.json();

            if (data.error === 'stripe_not_configured' || data.error === 'price_not_configured') {
                toast.error(t('stripeNotConfigured'), { description: t('stripeNotConfiguredDesc') });
                return;
            }

            if (data.url) {
                window.location.href = data.url;
            } else {
                throw new Error(data.error || 'No checkout URL');
            }
        } catch (err) {
            console.error('Checkout error:', err);
            toast.error(t('checkoutError'));
        } finally {
            setLoading(null);
        }
    };

    const handleManage = async () => {
        if (!stripeConfigured) {
            toast.error(t('stripeNotConfigured'));
            return;
        }
        setLoading('portal');
        try {
            const baseUrl = window.location.origin;
            const res = await fetch('/api/stripe/create-portal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    businessId,
                    returnUrl: `${baseUrl}/${locale}/business/dashboard/settings/payments`,
                }),
            });
            const data = await res.json();
            if (data.url) {
                window.open(data.url, '_blank');
            } else {
                toast.error(t('portalError'));
            }
        } catch {
            toast.error(t('portalError'));
        } finally {
            setLoading(null);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-[#14B8A6]" />
                    {t('title')}
                </h2>
                <p className="text-sm text-slate-500 mt-1">{t('subtitle')}</p>
            </div>

            {/* Stripe not configured warning */}
            {!stripeConfigured && (
                <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-semibold text-amber-800">{t('testModeTitle')}</p>
                        <p className="text-xs text-amber-700 mt-0.5">{t('testModeDesc')}</p>
                        <code className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded mt-1 inline-block">
                            STRIPE_SECRET_KEY=sk_test_...
                        </code>
                    </div>
                </div>
            )}

            {/* Current plan badge */}
            <div className="flex items-center gap-3 bg-[#F8FAFC] border border-[#E6E8EC] rounded-xl p-4">
                <div className="w-10 h-10 rounded-full bg-[#14B8A6]/10 flex items-center justify-center">
                    <Crown className="w-5 h-5 text-[#14B8A6]" />
                </div>
                <div className="flex-1">
                    <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold">{t('currentPlan')}</p>
                    <p className="font-bold text-slate-900 text-base capitalize">
                        {currentPlan === 'plus_team' ? 'Plus Equipo' :
                            currentPlan === 'premium' ? 'Premium' :
                                currentPlan === 'vip' ? 'VIP Colaborador' : t('planFree')}
                    </p>
                </div>
                {(currentPlan === 'premium' || currentPlan === 'plus_team') && hasStripeCustomer && (
                    <button
                        onClick={handleManage}
                        disabled={loading === 'portal'}
                        className="flex items-center gap-1.5 text-xs text-[#14B8A6] hover:text-[#0F766E] font-semibold transition-colors"
                    >
                        {loading === 'portal' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ExternalLink className="w-3.5 h-3.5" />}
                        {t('manageSub')}
                    </button>
                )}
            </div>

            {/* Plan cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {PLANS.map((plan) => {
                    const isCurrentPlan = currentPlan === plan.id;
                    const canUpgrade = plan.id !== 'free' && !isCurrentPlan;
                    const isPremium = plan.id === 'premium';
                    const isViolet = plan.id === 'plus_team';

                    return (
                        <div
                            key={plan.id}
                            className={`relative flex flex-col rounded-2xl border-2 p-5 transition-all ${isCurrentPlan
                                ? 'border-[#14B8A6] bg-[#14B8A6]/5 shadow-[0_0_0_1px_rgba(20,184,166,0.3)]'
                                : 'border-[#E6E8EC] bg-white hover:border-slate-300'
                                }`}
                        >
                            {/* Popular badge */}
                            {plan.popular && !isCurrentPlan && (
                                <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-bold bg-[#14B8A6] text-white px-3 py-1 rounded-full uppercase tracking-wide shadow">
                                    {t('popular')}
                                </span>
                            )}

                            {/* Plan icon + name */}
                            <div className="flex items-center gap-2 mb-3">
                                <span className="text-2xl">{plan.icon}</span>
                                <div>
                                    <p className="font-bold text-slate-900 text-sm">{t(plan.nameKey as any)}</p>
                                    <p className="text-xl font-extrabold text-slate-900">
                                        {plan.price === 0 ? t('free') : `$${plan.price}`}
                                        {plan.price > 0 && <span className="text-xs font-normal text-slate-400">/mes</span>}
                                    </p>
                                </div>
                            </div>

                            {/* Features */}
                            <ul className="space-y-2 flex-1 mb-4">
                                {plan.features.map((feat) => (
                                    <li key={feat} className="flex items-start gap-2 text-xs text-slate-600">
                                        <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${isCurrentPlan ? 'text-[#14B8A6]' : 'text-slate-400'}`} />
                                        {t(feat as any)}
                                    </li>
                                ))}
                            </ul>

                            {/* CTA Button */}
                            {isCurrentPlan ? (
                                <div className="w-full py-2 rounded-xl bg-[#14B8A6]/10 text-[#0F766E] text-xs font-bold text-center">
                                    ✓ {t('currentPlanBtn')}
                                </div>
                            ) : plan.id === 'free' ? (
                                <div className="w-full py-2 rounded-xl bg-slate-100 text-slate-400 text-xs font-medium text-center">
                                    {t('freeTier')}
                                </div>
                            ) : (
                                <button
                                    onClick={() => handleUpgrade(plan.id as 'premium' | 'plus_team')}
                                    disabled={!!loading}
                                    className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center justify-center gap-2 ${isPremium
                                        ? 'bg-[#14B8A6] hover:bg-[#0F9488] text-white shadow-[0_4px_12px_rgba(20,184,166,0.35)]'
                                        : 'bg-violet-600 hover:bg-violet-700 text-white shadow-[0_4px_12px_rgba(124,58,237,0.25)]'
                                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                                >
                                    {loading === plan.id ? (
                                        <><Loader2 className="w-3.5 h-3.5 animate-spin" /> {t('redirecting')}</>
                                    ) : (
                                        <>{isPremium ? <Zap className="w-3.5 h-3.5" /> : <Users className="w-3.5 h-3.5" />} {t('upgradeBtn')} {t(plan.nameKey as any)}</>
                                    )}
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Legal disclaimer — Critical for App Store compliance */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <p className="text-[11px] text-slate-500 leading-relaxed">
                    🔒 {t('legalNote')}
                </p>
            </div>
        </div>
    );
}
