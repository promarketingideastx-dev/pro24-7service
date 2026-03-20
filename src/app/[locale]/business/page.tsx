import { redirect } from 'next/navigation';

export default function BusinessPage({ params: { locale } }: { params: { locale: string } }) {
    // This page should ideally be unreachable because of the middleware/guards
    // But as a fallback, we redirect to dashboard
    redirect(`/${locale}/business/dashboard`);
}
