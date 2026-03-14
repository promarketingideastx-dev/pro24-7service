import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { ShieldCheck, UserPlus, ArrowLeft } from 'lucide-react';

export default function CuriousModeModal() {
    const locale = useLocale();
    const t = useTranslations('curiousMode');
    const lp = (path: string) => `/${locale}${path}`;

    return (
        <div className="fixed inset-0 z-[999] bg-white text-slate-900 flex flex-col items-center justify-center p-6 sm:p-8 animate-in fade-in duration-300">
            {/* Background design */}
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-500/05 rounded-full blur-[100px] pointer-events-none"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-teal-500/05 rounded-full blur-[100px] pointer-events-none"></div>

            <div className="w-full max-w-md bg-white border border-slate-200 shadow-2xl rounded-3xl p-8 relative z-10 text-center">
                <div className="mx-auto w-16 h-16 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center mb-6 shadow-sm border border-slate-100">
                    <ShieldCheck size={32} />
                </div>

                <h2 className="text-2xl font-bold tracking-tight mb-3 text-slate-800">
                    {t('limitReachedTitle')}
                </h2>

                <p className="text-slate-500 text-[15px] leading-relaxed mb-8">
                    {t('limitReachedDesc')}
                </p>

                <div className="space-y-3">
                    <Link
                        href={lp('/auth/register')}
                        className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-[0_8px_20px_rgba(37,99,235,0.25)] hover:shadow-[0_10px_25px_rgba(37,99,235,0.4)] transition-all flex items-center justify-center gap-2"
                    >
                        <UserPlus size={18} />
                        {t('createAccount')}
                    </Link>

                    <Link
                        href={lp('/auth/login')}
                        className="w-full py-3.5 bg-white border border-slate-200 text-slate-700 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                    >
                        {t('login')}
                    </Link>

                    <Link
                        href={lp('/')}
                        className="w-full py-3.5 bg-transparent text-slate-500 hover:text-slate-900 font-medium rounded-xl transition-all flex items-center justify-center gap-2"
                    >
                        <ArrowLeft size={16} />
                        {t('backToHome')}
                    </Link>
                </div>
            </div>
        </div>
    );
}
