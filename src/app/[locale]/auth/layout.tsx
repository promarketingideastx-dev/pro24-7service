export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-[#0B0F19] text-white flex flex-col justify-center items-center p-4 relative overflow-hidden">
            {/* Ambient Background */}
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-500/10 rounded-full blur-[100px] pointer-events-none"></div>

            {/* Content Container */}
            <div className="w-full max-w-md relative z-10 animate-in fade-in zoom-in duration-300">

                {/* Back Button */}
                <a href="/" className="absolute top-0 left-0 p-2 text-slate-500 hover:text-white transition-colors flex items-center gap-2 group" title="Volver al inicio">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:-translate-x-1 transition-transform">
                        <line x1="19" y1="12" x2="5" y2="12"></line>
                        <polyline points="12 19 5 12 12 5"></polyline>
                    </svg>
                    <span className="text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity -ml-2 group-hover:ml-0">Inicio</span>
                </a>

                {/* Logo / Brand */}
                <div className="text-center mb-8">
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
