import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'DMCA & Copyright | PRO24/7' };

export default function DmcaPage() {
    return (
        <div className="min-h-screen bg-[#F0F2F5] py-16 px-4">
            <div className="max-w-3xl mx-auto">
                <h1 className="text-2xl font-bold text-slate-900 mb-1">DMCA & Propiedad Intelectual</h1>
                <p className="text-slate-400 text-sm mb-8">PRO24/7 · Última actualización: {new Date().getFullYear()}</p>

                <div className="bg-white border border-slate-200 rounded-2xl p-8 space-y-6 text-sm text-slate-600 leading-relaxed">
                    <section>
                        <h2 className="text-slate-900 font-bold text-base mb-2">Política de Derechos de Autor</h2>
                        <p>PRO24/7 respeta los derechos de propiedad intelectual. Respondemos a notificaciones de infracción de derechos de autor de conformidad con el Digital Millennium Copyright Act (DMCA), 17 U.S.C. § 512, y las leyes de propiedad intelectual aplicables en cada país.</p>
                    </section>

                    <section>
                        <h2 className="text-slate-900 font-bold text-base mb-2">Reportar contenido infractor</h2>
                        <p className="mb-3">Si crees que tu obra protegida ha sido usada sin autorización en nuestra plataforma, envía una notificación que incluya:</p>
                        <ol className="space-y-2 list-decimal list-inside text-slate-400">
                            <li>Identificación de la obra protegida por derechos de autor</li>
                            <li>URL exacta del contenido infractor en PRO24/7</li>
                            <li>Tu información de contacto (nombre, email, teléfono)</li>
                            <li>Declaración de buena fe indicando que el uso no está autorizado</li>
                            <li>Declaración de veracidad bajo penalidad de perjurio</li>
                            <li>Tu firma electrónica o física</li>
                        </ol>
                    </section>

                    <section>
                        <h2 className="text-slate-900 font-bold text-base mb-2">Enviar notificación DMCA</h2>
                        <p>Correo designado: <a href="mailto:dmca@pro247.app" className="text-[#0F766E]">dmca@pro247.app</a></p>
                        <p className="mt-1 text-slate-500">Tiempo de respuesta: máximo 5 días hábiles. El contenido infractor será retirado mientras se investiga.</p>
                    </section>

                    <section>
                        <h2 className="text-slate-900 font-bold text-base mb-2">Contra-notificación</h2>
                        <p>Si tu contenido fue eliminado por error, puedes enviar una contra-notificación al mismo correo con evidencia de que tienes derecho a usar ese contenido.</p>
                    </section>
                </div>

                <div className="flex flex-wrap gap-3 mt-6 justify-center">
                    {['/legal/terms', '/legal/privacy', '/legal/cookies', '/legal/refunds'].map(href => (
                        <Link key={href} href={href} className="text-xs text-slate-500 hover:text-[#0F766E] transition-colors underline capitalize">
                            {href.split('/').pop()}
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
