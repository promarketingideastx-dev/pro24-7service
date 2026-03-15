'use client';

import React, { useEffect, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { ShieldAlert, X } from 'lucide-react';
import Link from 'next/link';
import { createPortal } from 'react-dom';

export type AuthRequiredContext = 'contact' | 'booking' | 'default';

interface AuthRequiredModalProps {
    isOpen: boolean;
    onClose: () => void;
    context?: AuthRequiredContext;
}

export function AuthRequiredModal({ isOpen, onClose, context = 'default' }: AuthRequiredModalProps) {
    const t = useTranslations('publicProfile.authRequiredAction');
    const locale = useLocale();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!isOpen || !mounted) return null;

    let titleKey = 'titleDefault';
    let descKey = 'descDefault';

    if (context === 'contact') {
        titleKey = 'titleContact';
        descKey = 'descContact';
    } else if (context === 'booking') {
        titleKey = 'titleBooking';
        descKey = 'descBooking';
    }

    const modalContent = (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-sm sm:p-4">
            <div
                className="bg-white w-full sm:w-[400px] rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden animate-in slide-in-from-bottom"
                role="dialog"
                aria-modal="true"
            >
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 bg-slate-100/50 hover:bg-slate-100 p-1.5 rounded-full transition-colors z-10"
                    aria-label="Cerrar modal"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Hero / Icon */}
                <div className="bg-indigo-50/50 pt-8 pb-6 px-6 flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 bg-white shadow-sm border border-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 mb-4">
                        <ShieldAlert className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900">
                        {t(titleKey)}
                    </h3>
                </div>

                {/* Content */}
                <div className="px-6 py-6 text-center">
                    <p className="text-slate-600 mb-8 leading-relaxed">
                        {t(descKey)}
                    </p>

                    <div className="flex flex-col gap-3">
                        <Link
                            href={`/${locale}/auth/register`}
                            className="w-full bg-indigo-600 text-white font-medium py-3.5 rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
                            onClick={onClose}
                        >
                            {t('createAccount')}
                        </Link>
                        <Link
                            href={`/${locale}/auth/login`}
                            className="w-full bg-slate-50 text-slate-700 font-medium py-3.5 rounded-xl hover:bg-slate-100 transition-colors border border-slate-200"
                            onClick={onClose}
                        >
                            {t('login')}
                        </Link>
                    </div>

                    <button
                        onClick={onClose}
                        className="w-full mt-4 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors py-2"
                    >
                        {t('cancel')}
                    </button>
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
}
