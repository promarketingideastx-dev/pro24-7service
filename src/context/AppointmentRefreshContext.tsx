'use client';

import { createContext, useContext, useState, useCallback } from 'react';

/**
 * AppointmentRefreshContext
 * Lightweight bridge to trigger a re-fetch of appointments in the Agenda
 * when an action is taken in the Inbox (which lives on a different page/subtree).
 * No polling. No heavy state. Just a timestamp signal.
 */
interface AppointmentRefreshContextType {
    lastRefresh: number;
    triggerRefresh: () => void;
}

const AppointmentRefreshContext = createContext<AppointmentRefreshContextType>({
    lastRefresh: 0,
    triggerRefresh: () => { },
});

export function AppointmentRefreshProvider({ children }: { children: React.ReactNode }) {
    const [lastRefresh, setLastRefresh] = useState<number>(Date.now());

    const triggerRefresh = useCallback(() => {
        setLastRefresh(Date.now());
    }, []);

    return (
        <AppointmentRefreshContext.Provider value={{ lastRefresh, triggerRefresh }}>
            {children}
        </AppointmentRefreshContext.Provider>
    );
}

export function useAppointmentRefresh() {
    return useContext(AppointmentRefreshContext);
}
