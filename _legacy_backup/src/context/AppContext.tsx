'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Country, COUNTRIES } from '@/lib/countries';

type AppRole = 'client' | 'provider';

interface AppContextType {
    country: Country | null;
    setCountry: (country: Country) => void;
    role: AppRole;
    setRole: (role: AppRole) => void;
    isInitialized: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
    const [country, setCountryState] = useState<Country | null>(null);
    const [role, setRole] = useState<AppRole>('client');
    const [isInitialized, setIsInitialized] = useState(false);

    useEffect(() => {
        const savedCountry = localStorage.getItem('app_country');
        if (savedCountry) {
            const found = COUNTRIES.find(c => c.code === savedCountry);
            if (found) setCountryState(found);
        }
        const savedRole = localStorage.getItem('app_role');
        if (savedRole === 'client' || savedRole === 'provider') {
            setRole(savedRole);
        }
        setIsInitialized(true);
    }, []);

    const setCountry = (c: Country) => {
        setCountryState(c);
        localStorage.setItem('app_country', c.code);
    };

    const handleSetRole = (r: AppRole) => {
        setRole(r);
        localStorage.setItem('app_role', r);
    };

    return (
        <AppContext.Provider value={{ country, setCountry, role, setRole: handleSetRole, isInitialized }}>
            {children}
        </AppContext.Provider>
    );
}

export function useAppContext() {
    const context = useContext(AppContext);
    if (context === undefined) {
        throw new Error('useAppContext must be used within an AppProvider');
    }
    return context;
}
