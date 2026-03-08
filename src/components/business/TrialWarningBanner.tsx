'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { TrialService, TrialStatus } from '@/services/trial.service';
import { AlertTriangle, Clock } from 'lucide-react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';

export default function TrialWarningBanner() {
    const { user } = useAuth();
    const [trialStatus, setTrialStatus] = useState<TrialStatus | null>(null);
    const locale = useLocale();

    useEffect(() => {
        if (!user?.uid) return;

        const checkTrial = async () => {
            const snap = await getDoc(doc(db, 'businesses', user.uid));
            if (snap.exists()) {
                const status = TrialService.getTrialStatus(snap.data() as any);
                setTrialStatus(status);
            }
        };

        checkTrial();
    }, [user]);

    if (!trialStatus || !trialStatus.showReminderBanner || trialStatus.showUrgentBanner) {
        return null;
    }

    return (
        <div className="w-full bg-orange-100 border-b border-orange-200 px-4 py-3 flex items-center justify-between text-orange-800 animate-in slide-in-from-top-4">
            <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-orange-600 animate-pulse" />
                <div>
                    <strong className="text-sm">Tu periodo de prueba finaliza pronto.</strong>
                    <p className="text-xs opacity-90">Te quedan {trialStatus.daysLeft} días de acceso completo. Evita interrupciones.</p>
                </div>
            </div>
            <Link
                href={`/${locale}/pricing`}
                className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors shadow-sm"
            >
                Ver Planes
            </Link>
        </div>
    );
}
