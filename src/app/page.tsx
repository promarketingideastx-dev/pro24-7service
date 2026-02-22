import { redirect } from 'next/navigation';

// Root page: redirect to default locale (ES)
// This page is hit when middleware does not add a locale prefix
export default function RootPage() {
    redirect('/es');
}
