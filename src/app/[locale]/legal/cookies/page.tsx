import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Política de Cookies | PRO24/7' };

export default function CookiesPage() {
    return (
        <div className="min-h-screen bg-[#F0F2F5] py-16 px-4">
            <div className="max-w-3xl mx-auto">
                <h1 className="text-2xl font-bold text-slate-900 mb-1">Política de Cookies</h1>
                <p className="text-slate-400 text-sm mb-8">PRO24/7 · Última actualización: {new Date().getFullYear()}</p>

                <div className="bg-white border border-slate-200 rounded-2xl p-8 space-y-6 text-sm text-slate-600 leading-relaxed">
                    <section>
                        <h2 className="text-slate-900 font-bold text-base mb-2">¿Qué son las cookies?</h2>
                        <p>Son pequeños archivos almacenados en tu dispositivo que nos permiten recordar tus preferencias y mejorar tu experiencia.</p>
                    </section>

                    <section>
                        <h2 className="text-slate-900 font-bold text-base mb-3">Tipos de cookies que usamos</h2>
                        <div className="space-y-3">
                            {[
                                { name: '✅ Necesarias (siempre activas)', desc: 'Autenticación de sesión, seguridad CSRF, preferencias de idioma y país. No pueden desactivarse.' },
                                { name: '📊 Analíticas', desc: 'Miden cómo se usa la app: páginas visitadas, tiempo en pantalla, eventos. Los datos son anónimos.' },
                                { name: '🎯 Marketing y conversión', desc: 'Miden la efectividad de campañas en Meta, Google, TikTok. Solo activas si aceptas todas las cookies.' },
                            ].map(c => (
                                <div key={c.name} className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                                    <p className="font-semibold text-slate-900 mb-1">{c.name}</p>
                                    <p className="text-slate-400">{c.desc}</p>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section>
                        <h2 className="text-slate-900 font-bold text-base mb-2">Gestión de cookies</h2>
                        <p>Puedes cambiar tus preferencias en cualquier momento borrando los datos de {'"'}pro247_cookies_consent{'"'} de tu localStorage, o desde los ajustes de tu navegador.</p>
                    </section>

                    <section>
                        <h2 className="text-slate-900 font-bold text-base mb-2">Marco legal</h2>
                        <p className="text-slate-400">Esta política cumple con el Reglamento ePrivacy (UE), GDPR, LGPD (Brasil) y las guías de la FTC (USA). Al aceptar cookies opcionales, otorgas tu consentimiento explícito conforme a estas normativas.</p>
                    </section>
                </div>

                <div className="flex flex-wrap gap-3 mt-6 justify-center">
                    {['/legal/terms', '/legal/privacy', '/legal/refunds'].map(href => (
                        <Link key={href} href={href} className="text-xs text-slate-500 hover:text-[#0F766E] transition-colors underline capitalize">
                            {href.split('/').pop()}
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
