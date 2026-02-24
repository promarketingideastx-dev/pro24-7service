'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { PauseCircle, XCircle } from 'lucide-react';

interface CollaboratorGuardProps {
    planStatus?: string;
    planSource?: string;
    pauseReason?: string;
    children: React.ReactNode;
}

/**
 * Wraps provider dashboard content.
 * If the admin paused or deactivated the account, shows a blocking screen instead.
 */
export default function CollaboratorGuard({
    planStatus,
    planSource,
    pauseReason,
    children,
}: CollaboratorGuardProps) {
    const t = useTranslations('collaboratorGuard');
    const locale = useLocale();
    const router = useRouter();

    // Only VIP collaborators are subject to this guard
    if (planSource !== 'collaborator_beta') {
        return <>{children}</>;
    }

    if (planStatus === 'paused') {
        return (
            <div className="min-h-screen bg-[#F4F6F8] flex items-center justify-center p-6">
                <div className="max-w-md w-full text-center">
                    {/* Icon */}
                    <div className="flex justify-center mb-6">
                        <div className="w-20 h-20 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
                            <PauseCircle className="w-10 h-10 text-amber-400" />
                        </div>
                    </div>

                    <h1 className="text-2xl font-bold text-white mb-3">
                        {t('pausedTitle')}
                    </h1>
                    <p className="text-slate-400 leading-relaxed mb-4">
                        {t('pausedBody')}
                    </p>
                    {pauseReason && (
                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 text-amber-300 text-sm mb-6">
                            {t('pauseReason')}: <em>{pauseReason}</em>
                        </div>
                    )}
                    <p className="text-slate-500 text-sm">{t('contactAdmin')}</p>
                </div>
            </div>
        );
    }

    if (planStatus === 'inactive' || planStatus === 'cancelled') {
        return (
            <div className="min-h-screen bg-[#F4F6F8] flex items-center justify-center p-6">
                <div className="max-w-md w-full text-center">
                    <div className="flex justify-center mb-6">
                        <div className="w-20 h-20 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center">
                            <XCircle className="w-10 h-10 text-red-400" />
                        </div>
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-3">
                        {t('inactiveTitle')}
                    </h1>
                    <p className="text-slate-400 leading-relaxed mb-6">
                        {t('inactiveBody')}
                    </p>
                    <p className="text-slate-500 text-sm">{t('contactAdmin')}</p>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
