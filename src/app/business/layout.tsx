import BusinessShell from '@/components/business/BusinessShell';

import { Suspense } from 'react';

export default function BusinessLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // Server Component Layout typically acts as a boundary
    // We delegate the "Shell" (Client Component) to handle state/interactivity
    return (
        <Suspense fallback={null}>
            <BusinessShell>
                {children}
            </BusinessShell>
        </Suspense>
    );
}
