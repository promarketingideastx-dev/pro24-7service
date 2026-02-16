'use client';

import { AuthProvider } from '@/context/AuthContext';
import { CountryProvider } from '@/context/CountryContext';
import AuthGuard from '@/components/auth/AuthGuard';

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <AuthProvider>
            <CountryProvider>
                <AuthGuard>
                    {children}
                </AuthGuard>
            </CountryProvider>
        </AuthProvider>
    );
}
