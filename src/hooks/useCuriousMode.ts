import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';

const MAX_VISITS = 5;
const STORAGE_KEY = 'pro247_curious_mode_visits';
const VISITED_BUSINESSES_KEY = 'pro247_visited_businesses';

export function useCuriousMode(businessId: string | null) {
    const { user, loading } = useAuth();
    const [visits, setVisits] = useState(0);
    const [isBlocked, setIsBlocked] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);

    useEffect(() => {
        if (loading) return;

        // If the user is logged in, they are never blocked
        if (user) {
            setIsBlocked(false);
            setIsInitialized(true);
            return;
        }

        // We only track when a businessId is provided (actually visiting a profile)
        if (!businessId) {
            setIsInitialized(true);
            return;
        }

        try {
            // Get current visits
            const currentVisits = parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10);

            // Get already visited businesses array to avoid double counting reloads
            const visitedString = localStorage.getItem(VISITED_BUSINESSES_KEY) || '[]';
            const visitedBusinesses: string[] = JSON.parse(visitedString);

            // If this business hasn't been visited yet, increment counter
            let newVisits = currentVisits;
            if (!visitedBusinesses.includes(businessId)) {
                newVisits = currentVisits + 1;
                visitedBusinesses.push(businessId);

                localStorage.setItem(STORAGE_KEY, newVisits.toString());
                localStorage.setItem(VISITED_BUSINESSES_KEY, JSON.stringify(visitedBusinesses));
            }

            setVisits(newVisits);

            // Check if blocked using the strictly greater condition mentioned (after 5th visit)
            if (newVisits > MAX_VISITS) {
                setIsBlocked(true);
            } else {
                setIsBlocked(false);
            }
        } catch (e) {
            console.error('LocalStorage error in Curious Mode:', e);
            // Default to not blocked if localStorage fails (e.g. strict privacy mode)
            setIsBlocked(false);
        }

        setIsInitialized(true);

    }, [user, loading, businessId]);

    return { visits, isBlocked, isInitialized, maxVisits: MAX_VISITS };
}
