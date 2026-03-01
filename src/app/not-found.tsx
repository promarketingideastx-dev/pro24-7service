import Link from 'next/link';

export default function NotFound() {
    return (
        <main className="min-h-screen flex flex-col items-center justify-center p-8 text-center bg-slate-50">
            <div className="space-y-4 max-w-sm">
                <h1 className="text-3xl font-bold text-slate-900">404</h1>
                <p className="text-slate-500 text-sm">
                    Page not found or unavailable.
                </p>
                <Link
                    href="/"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-sm font-bold transition-all shadow-md"
                >
                    Return Home
                </Link>
            </div>
        </main>
    );
}
