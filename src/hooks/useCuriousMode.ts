import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { AnalyticsService } from '@/services/analytics.service';

export const MAX_VISITS = 5;
export const CURIOUS_STORAGE_KEY = 'curious_business_views';
export const CURIOUS_STARTED_KEY = 'curious_mode_started';
export const CURIOUS_EXPIRY_KEY = 'curious_mode_expiry';
const EXPIRY_HOURS = 24;

export function useCuriousMode(businessId: string | null, countryCode?: string) {
    const { user, loading } = useAuth();
    const [visits, setVisits] = useState(0);
    const [isBlocked, setIsBlocked] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);

    const trackedRef = useRef<Record<string, boolean>>({});

    useEffect(() => {
        if (loading) return;

        // If the user is logged in, they are never blocked
        if (user) {
            setIsBlocked(false);
            setIsInitialized(true);
            return;
        }

        try {
            // Track "Started"
            const hasStarted = localStorage.getItem(CURIOUS_STARTED_KEY);
            if (!hasStarted) {
                localStorage.setItem(CURIOUS_STARTED_KEY, 'true');
                AnalyticsService.track({
                    type: 'curious_mode_started',
                    businessId: 'system',
                    country: countryCode || 'Unknown'
                }).catch(() => { });
            }

            // Check Expiration (TTL)
            const now = Date.now();
            const expiryString = localStorage.getItem(CURIOUS_EXPIRY_KEY);
            if (expiryString) {
                const expiryTime = parseInt(expiryString, 10);
                if (now > expiryTime) {
                    // 24 hours passed, clear previous state
                    localStorage.removeItem(CURIOUS_STORAGE_KEY);
                    localStorage.removeItem(CURIOUS_STARTED_KEY);
                    localStorage.removeItem(CURIOUS_EXPIRY_KEY);
                }
            } else {
                // Initialize TTL for first time ever
                localStorage.setItem(CURIOUS_EXPIRY_KEY, (now + EXPIRY_HOURS * 60 * 60 * 1000).toString());
            }

            if (!businessId || businessId === '') {
                setIsInitialized(true);
                return;
            }

            // Get already visited businesses array. Using array length as the sole source of truth.
            const visitedString = localStorage.getItem(CURIOUS_STORAGE_KEY) || '[]';
            let visitedBusinesses: string[] = [];
            try {
                visitedBusinesses = JSON.parse(visitedString);
                if (!Array.isArray(visitedBusinesses)) visitedBusinesses = [];
            } catch {
                visitedBusinesses = [];
            }

            let newlyVisited = false;

            // Evitar empujar IDs vacíos o nulos, y asegurar que son negocios ÚNICOS
            if (businessId && businessId.trim() !== '' && !visitedBusinesses.includes(businessId)) {
                visitedBusinesses.push(businessId);
                localStorage.setItem(CURIOUS_STORAGE_KEY, JSON.stringify(visitedBusinesses));
                newlyVisited = true;
            }

            // Filtrar preventivamente IDs vacíos que el localStorage pueda haber tragado
            const currentTotalVisits = visitedBusinesses.filter(id => id && id.trim() !== '').length;
            setVisits(currentTotalVisits);

            // Curious Mode 2.0: Never block based on view count.
            setIsBlocked(false);
            if (newlyVisited && !trackedRef.current['viewed_' + businessId]) {
                trackedRef.current['viewed_' + businessId] = true;
                AnalyticsService.track({
                    type: 'curious_business_viewed',
                    businessId: businessId,
                    country: countryCode || 'Unknown'
                }).catch(() => { });
            }
        } catch (e) {
            console.error('LocalStorage error in Curious Mode:', e);
            // Default to not blocked if localStorage fails
            setIsBlocked(false);
        }

        setIsInitialized(true);

    }, [user, loading, businessId, countryCode]);

    return { visits, isBlocked, isInitialized, maxVisits: MAX_VISITS };
}

export function clearCuriousModeStorage(countryCode?: string) {
    try {
        const visitedString = localStorage.getItem(CURIOUS_STORAGE_KEY) || '[]';
        let visitedBusinesses: string[] = [];
        try { visitedBusinesses = JSON.parse(visitedString); } catch { }

        if (visitedBusinesses.length > 0) {
            AnalyticsService.track({
                type: 'curious_signup',
                businessId: 'system',
                country: countryCode || 'Unknown'
            }).catch(() => { });
        }

        localStorage.removeItem(CURIOUS_STORAGE_KEY);
        localStorage.removeItem(CURIOUS_STARTED_KEY);
        localStorage.removeItem(CURIOUS_EXPIRY_KEY);
    } catch (e) {
        // ignore
    }
}
