'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { CountryCode, CountryConfig, getCountryConfig, isSupportedCountry } from '@/lib/locations';

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
        // Load from LocalStorage
        const saved = localStorage.getItem('p24_country');
        if (saved && isSupportedCountry(saved)) {
            setSelectedCountry(getCountryConfig(saved as CountryCode));
        }
        // Force loading state to show selector even if null
        setIsLoading(false);
    }, []);

    const selectCountry = (code: CountryCode) => {
        localStorage.setItem('p24_country', code);
        setSelectedCountry(getCountryConfig(code));
    };

    const clearCountry = () => {
        localStorage.removeItem('p24_country');
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
