'use client';

import React from 'react';
import { TrialService } from '@/services/trial.service';
import { AlertTriangle, Clock, X } from 'lucide-react';
import Link from 'next/link';
import { useLocale } from 'next-intl';

interface TrialBannerProps {
    business: {
        planData?: any;
    };
    onDismiss?: () => void;
}

/**
 * TrialBanner — Shows a non-intrusive banner in the business dashboard
 * indicating how many days remain in the free trial.
 *
 * - Hidden if trial is not active or if CRM override is present.
 * - Shows green for > 2 days, yellow for 1-2 days, red for last day.
 */
export function TrialBanner({ business, onDismiss }: TrialBannerProps) {
    const locale = useLocale();
    const lp = (path: string) => `/${locale}${path}`;
    const status = TrialService.getTrialStatus(business);

    // Don't show if not in trial, or CRM override is active
    if (!status.isInTrial || status.overriddenByCRM) return null;

    const isUrgent = status.daysLeft <= 1;
    const isWarning = status.daysLeft <= 3 && status.daysLeft > 1;

    const colors = isUrgent
        ? 'bg-red-500/10 border-red-500/30 text-red-300'
        : isWarning
            ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
            : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300';

    const iconColor = isUrgent ? 'text-red-400' : isWarning ? 'text-amber-400' : 'text-cyan-400';

    return (
        <div className={`relative flex items-center gap-3 px-4 py-3 rounded-xl border text-sm mb-4 ${colors}`}>
            {isUrgent ? (
                <AlertTriangle className={`w-4 h-4 shrink-0 ${iconColor}`} />
            ) : (
                <Clock className={`w-4 h-4 shrink-0 ${iconColor}`} />
            )}

            <span className="flex-1">
                <strong>Prueba gratuita:</strong>{' '}
                {status.daysLeft === 0
                    ? 'Hoy es el último día. '
                    : `Te quedan ${status.daysLeft} ${status.daysLeft === 1 ? 'día' : 'días'}. `}
                <Link
                    href={lp('/pricing')}
                    className="underline underline-offset-2 font-bold hover:opacity-80 transition-opacity"
                >
                    Ver planes →
                </Link>
            </span>

            {onDismiss && (
                <button
                    onClick={onDismiss}
                    className="shrink-0 p-1 rounded-full hover:bg-white/10 transition-colors"
                    aria-label="Dismiss"
                >
                    <X className="w-3.5 h-3.5" />
                </button>
            )}
        </div>
    );
}

/**
 * TrialExpiredOverlay — Full-screen block when trial has ended.
 * Shown instead of dashboard content.
 */
export function TrialExpiredOverlay({ business }: { business: { planData?: any } }) {
    const locale = useLocale();
    const lp = (path: string) => `/${locale}${path}`;
    const status = TrialService.getTrialStatus(business);

    if (!status.isExpired || status.overriddenByCRM) return null;

    return (
        <div className="fixed inset-0 z-[9999] bg-[#0B0F19]/95 backdrop-blur-sm flex items-center justify-center p-6">
            <div className="bg-[#151b2e] border border-white/10 rounded-3xl p-8 max-w-md w-full text-center shadow-2xl">
                <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-6">
                    <Clock className="w-8 h-8 text-amber-400" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">
                    Tu prueba gratuita finalizó
                </h2>
                <p className="text-slate-400 text-sm mb-8">
                    Para continuar usando Pro24/7YA, elige el plan que mejor se adapte a tu negocio.
                    Todos los datos de tu perfil están seguros.
                </p>
                <Link
                    href={lp('/pricing')}
                    className="inline-flex items-center justify-center w-full py-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-sm hover:from-cyan-400 hover:to-blue-500 transition-all shadow-[0_0_30px_rgba(0,240,255,0.2)]"
                >
                    Ver planes de Pro24/7YA
                </Link>
            </div>
        </div>
    );
}
