'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface AdminContextValue {
    selectedCountry: string; // 'ALL' | 'HN' | 'US' ...
    setSelectedCountry: (code: string) => void;
    selectedLang: string; // 'es' | 'en' | 'pt-BR'
    setSelectedLang: (lang: string) => void;
}

const AdminContext = createContext<AdminContextValue>({
    selectedCountry: 'ALL',
    setSelectedCountry: () => { },
    selectedLang: 'es',
    setSelectedLang: () => { },
});

export function AdminContextProvider({ children }: { children: ReactNode }) {
    const [selectedCountry, setSelectedCountry] = useState('ALL');
    const [selectedLang, setSelectedLang] = useState('es');

    return (
        <AdminContext.Provider value={{ selectedCountry, setSelectedCountry, selectedLang, setSelectedLang }}>
            {children}
        </AdminContext.Provider>
    );
}

export const useAdminContext = () => useContext(AdminContext);
