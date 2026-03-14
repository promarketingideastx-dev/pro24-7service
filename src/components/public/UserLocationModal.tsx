'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { MapPin, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { UserService } from '@/services/user.service';
import { AnalyticsService } from '@/services/analytics.service';
import { Capacitor } from '@capacitor/core';

export default function UserLocationModal() {
    const t = useTranslations('userLocation');
    const { user, userProfile, refreshProfile, loading } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        // Wait till auth is resolved
        if (loading) return;

        // Show ONLY to authenticated users
        if (!user || !userProfile) {
            setIsOpen(false);
            return;
        }

        // If they already have location defined (granted or denied), don't show
        if (userProfile.userLocation) {
            setIsOpen(false);
            return;
        }

        // Delay slight bit to ensure smooth entry if just logged in
        const timer = setTimeout(() => {
            setIsOpen(true);
            AnalyticsService.track({
                type: 'user_location_permission_requested',
                businessId: 'system',
                userUid: user.uid,
                country: userProfile.country_code
            });
        }, 800);

        return () => clearTimeout(timer);
    }, [user, userProfile, loading]);

    const handleGrant = async () => {
        setIsProcessing(true);
        if (Capacitor.isNativePlatform()) {
            try {
                const { Geolocation } = await import('@capacitor/geolocation');
                let status = await Geolocation.checkPermissions();
                if (status.location !== 'granted') {
                    status = await Geolocation.requestPermissions();
                    if (status.location !== 'granted') {
                        handleDeny(); // fallback to deny flow
                        return;
                    }
                }
                const position = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
                await saveLocation(position.coords.latitude, position.coords.longitude);
            } catch (e) {
                console.warn('Capacitor geolocation failed', e);
                handleDeny();
            }
        } else {
            if (!navigator.geolocation) {
                handleDeny();
                return;
            }
            navigator.geolocation.getCurrentPosition(
                async (pos) => {
                    await saveLocation(pos.coords.latitude, pos.coords.longitude);
                },
                (err) => {
                    console.warn('Web geolocation failed/denied', err);
                    handleDeny();
                },
                { timeout: 10000, enableHighAccuracy: true }
            );
        }
    };

    const saveLocation = async (lat: number, lng: number) => {
        try {
            await UserService.updateUserProfile(user!.uid, {
                userLocation: {
                    lat,
                    lng,
                    timestamp: Date.now()
                }
            } as any);

            AnalyticsService.track({
                type: 'user_location_permission_granted',
                businessId: 'system',
                userUid: user!.uid,
                country: userProfile!.country_code
            });

            await refreshProfile();
            setIsOpen(false);
        } catch (error) {
            console.error('Failed to save user location', error);
            setIsOpen(false);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDeny = async () => {
        setIsProcessing(true);
        try {
            await UserService.updateUserProfile(user!.uid, {
                userLocation: {
                    denied: true,
                    timestamp: Date.now()
                }
            } as any);

            AnalyticsService.track({
                type: 'user_location_permission_denied',
                businessId: 'system',
                userUid: user!.uid,
                country: userProfile!.country_code
            });

            await refreshProfile();
            setIsOpen(false);
        } catch (error) {
            console.error('Failed to save denial', error);
            setIsOpen(false);
        } finally {
            setIsProcessing(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl w-full max-w-sm p-8 shadow-2xl animate-in zoom-in-95 duration-300 relative text-center">
                {/* Decoration */}
                <div className="mx-auto w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-6 ring-8 ring-blue-50/50">
                    <MapPin className="w-8 h-8" />
                </div>

                <h2 className="text-xl font-bold tracking-tight text-slate-900 mb-2">
                    {t('title')}
                </h2>
                <p className="text-slate-500 text-sm leading-relaxed mb-8">
                    {t('message')}
                </p>

                <div className="flex flex-col gap-3">
                    <button
                        onClick={handleGrant}
                        disabled={isProcessing}
                        className="w-full bg-[#14B8A6] hover:bg-[#0F9488] text-white font-bold py-3.5 px-6 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center"
                    >
                        {isProcessing ? (
                            <span className="w-5 h-5 border-2 border-slate-300 border-t-white rounded-full animate-spin" />
                        ) : (
                            t('grantBtn')
                        )}
                    </button>

                    <button
                        onClick={handleDeny}
                        disabled={isProcessing}
                        className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-3.5 px-6 rounded-xl transition-colors disabled:opacity-50"
                    >
                        {t('denyBtn')}
                    </button>
                </div>
            </div>
        </div>
    );
}
