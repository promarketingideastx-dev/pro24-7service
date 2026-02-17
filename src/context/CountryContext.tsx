'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { CountryCode, CountryConfig, getCountryConfig, isSupportedCountry } from '@/lib/locations';
import { ActiveCountry } from '@/lib/activeCountry';

interface CountryContextType {
    selectedCountry: CountryConfig | null;
    selectCountry: (code: CountryCode) => void;
    clearCountry: () => void;
    isLoading: boolean;
}

const CountryContext = createContext<CountryContextType | undefined>(undefined);

export function CountryProvider({ children }: { children: React.ReactNode }) {
    const [selectedCountry, setSelectedCountry] = useState<CountryConfig | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Load from Helper
        const saved = ActiveCountry.get();
        setSelectedCountry(getCountryConfig(saved));
        // Force loading state to show selector even if null? 
        // Logic change: If we have a default/saved, we are NOT loading.
        // But if we want to force selector on first visit ever?
        // ActiveCountry.get() returns DEFAULT if nothing found, so we always have one.
        // We might want to check if it was *actually* saved vs default to show selector?
        // For now, adhering to instruction: Persist and read.
        setIsLoading(false);
    }, []);

    const selectCountry = (code: CountryCode) => {
        ActiveCountry.set(code);
        setSelectedCountry(getCountryConfig(code));
    };

    const clearCountry = () => {
        // We probably shouldn't "clear" to null if we want strict persistence,
        // but removing logic allows showing the selector again.
        localStorage.removeItem('pro247_country'); // Manually remove for 'reset' effect if needed
        document.cookie = 'pro247_country=; Max-Age=0; path=/;';
        setSelectedCountry(null);
    };

    return (
        <CountryContext.Provider value={{ selectedCountry, selectCountry, clearCountry, isLoading }}>
            {children}
        </CountryContext.Provider>
    );
}

export function useCountry() {
    const context = useContext(CountryContext);
    if (!context) {
        throw new Error('useCountry must be used within a CountryProvider');
    }
    return context;
}
