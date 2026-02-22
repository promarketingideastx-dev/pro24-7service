import { redirect } from 'next/navigation';

export default function BusinessPage() {
    // This page should ideally be unreachable because of the middleware/guards
    // But as a fallback, we redirect to dashboard
    redirect('/business/dashboard');
}
