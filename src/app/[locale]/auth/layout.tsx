import { BackButton } from './BackButton';

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-[#F4F6F8] text-slate-900 flex flex-col justify-center items-center p-4 relative overflow-hidden">
            {/* Ambient Background */}
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-500/10 rounded-full blur-[100px] pointer-events-none"></div>

            {/* Back Button Container (Fixed at top-left to avoid notch issues) */}
            <div className="fixed top-[env(safe-area-inset-top,1rem)] pt-6 pl-4 left-0 z-50">
                <BackButton />
            </div>

            {/* Content Container */}
            <div className="w-full max-w-md relative z-10 animate-in fade-in zoom-in duration-300 pt-8">

                {/* Logo / Brand */}
                <div className="text-center mb-6">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src="/logo.png"
                        alt="Pro24/7YA"
                        className="w-32 h-32 mx-auto object-contain"
                    />
                </div>

                {children}

            </div>
        </div>
    );
}
