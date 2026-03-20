import { redirect } from 'next/navigation';

export default function AdminRootPage({ params: { locale } }: { params: { locale: string } }) {
    redirect(`/${locale}/admin/businesses`);
}
