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
        // Only load a saved country if the user has explicitly selected one before.
        // First-time visitors (no saved preference) get null → shows CountrySelector.
        if (ActiveCountry.hasExplicitSelection()) {
            const saved = ActiveCountry.get();
            setSelectedCountry(getCountryConfig(saved));
        } else {
            setSelectedCountry(null);
        }
        setIsLoading(false);
    }, []);

    const selectCountry = (code: CountryCode) => {
        ActiveCountry.set(code);
        setSelectedCountry(getCountryConfig(code));
    };

    const clearCountry = () => {
        ActiveCountry.clear();
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
