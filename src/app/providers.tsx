'use client';

import { AuthProvider } from '@/context/AuthContext';
import { CountryProvider } from '@/context/CountryContext';
import AuthGuard from '@/components/auth/AuthGuard';

import { Suspense } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <AuthProvider>
            <CountryProvider>
                <Suspense fallback={null}>
                    <AuthGuard>
                        {children}
                    </AuthGuard>
                </Suspense>
            </CountryProvider>
        </AuthProvider>
    );
}
