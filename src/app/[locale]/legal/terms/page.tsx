import type { Metadata } from 'next';
import { FileText } from 'lucide-react';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Términos de Uso | PRO24/7' };

const COUNTRY_REFS: Record<string, string> = {
    HN: 'Honduras (Decreto 149-83 - Código de Comercio y Ley de Protección al Consumidor)',
    US: 'United States (FTC Act, Section 5 / CCPA for California residents)',
    MX: 'México (LFCEA - Ley Federal de Comercio Electrónico y LFPDPPP)',
    BR: 'Brasil (Lei 8.078/1990 - CDC y Lei 13.709/2018 - LGPD)',
    GT: 'Guatemala (Decreto 2-70 - Código de Comercio)',
    SV: 'El Salvador (Ley de Comercio Electrónico)',
};

export default function TermsPage() {
    const year = new Date().getFullYear();

    return (
        <div className="min-h-screen bg-[#F0F2F5] py-16 px-4">
            <div className="max-w-3xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 rounded-xl bg-brand-neon-cyan/10 border border-brand-neon-cyan/20 flex items-center justify-center">
                        <FileText size={20} className="text-[#0F766E]" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white">Términos de Uso</h1>
                        <p className="text-slate-400 text-sm">PRO24/7 · Última actualización: {year}</p>
                    </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-8 prose prose-invert max-w-none">
                    <div className="space-y-6 text-sm text-slate-600 leading-relaxed">

                        <section>
                            <h2 className="text-slate-900 font-bold text-base mb-2">1. Aceptación de Términos</h2>
                            <p>Al acceder o utilizar los servicios de PRO24/7 (la &ldquo;Plataforma&rdquo;), aceptas estos Términos de Uso. Si no estás de acuerdo, no uses la Plataforma. Estos términos se rigen por las leyes aplicables según tu país de residencia.</p>
                        </section>

                        <section>
                            <h2 className="text-slate-900 font-bold text-base mb-2">2. Descripción del Servicio</h2>
                            <p>PRO24/7 es una plataforma de marketplace que conecta proveedores de servicios profesionales con clientes. PRO24/7 actúa como intermediario y no es parte de los acuerdos comerciales entre usuarios.</p>
                        </section>

                        <section>
                            <h2 className="text-slate-900 font-bold text-base mb-2">3. Cuentas de Usuario</h2>
                            <p>Eres responsable de mantener la confidencialidad de tu cuenta. Debes ser mayor de 18 años o tener autorización de un tutor legal. Nos reservamos el derecho de suspender cuentas que violen estos términos.</p>
                        </section>

                        <section>
                            <h2 className="text-slate-900 font-bold text-base mb-2">4. Negocios y Proveedores</h2>
                            <p>Los negocios registrados son responsables de la veracidad de su información y de cumplir con las leyes locales aplicables a sus servicios. PRO24/7 no garantiza la calidad ni la disponibilidad de los servicios ofrecidos.</p>
                        </section>

                        <section>
                            <h2 className="text-slate-900 font-bold text-base mb-2">5. Pagos y Suscripciones</h2>
                            <p>Los planes de suscripción se cobran según el plan seleccionado. Los pagos se procesan a través de pasarelas seguras. No ofrecemos reembolsos salvo lo indicado en nuestra Política de Reembolsos.</p>
                        </section>

                        <section>
                            <h2 className="text-slate-900 font-bold text-base mb-2">6. Propiedad Intelectual</h2>
                            <p>Todo el contenido de PRO24/7 está protegido. Al subir contenido, otorgas a PRO24/7 una licencia no exclusiva para mostrarlo en la plataforma. Puedes reportar violaciones en <a href="/legal/dmca" className="text-[#0F766E]">nuestra página DMCA</a>.</p>
                        </section>

                        <section>
                            <h2 className="text-slate-900 font-bold text-base mb-2">7. Limitación de Responsabilidad</h2>
                            <p>PRO24/7 no se hace responsable por daños indirectos, pérdida de datos o interrupciones del servicio. Nuestra responsabilidad máxima se limita al monto pagado en los últimos 12 meses.</p>
                        </section>

                        <section>
                            <h2 className="text-slate-900 font-bold text-base mb-2">8. Ley Aplicable</h2>
                            <p>Estos términos se rigen por las leyes del país donde operas. Las referencias legales incluyen:</p>
                            <ul className="mt-2 space-y-1">
                                {Object.values(COUNTRY_REFS).map((ref, i) => (
                                    <li key={i} className="text-slate-400 text-xs">• {ref}</li>
                                ))}
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-slate-900 font-bold text-base mb-2">9. Modificaciones</h2>
                            <p>Podemos actualizar estos términos en cualquier momento. Te notificaremos con al menos 7 días de anticipación para cambios materiales. El uso continuado de la Plataforma implica aceptación.</p>
                        </section>

                        <section>
                            <h2 className="text-slate-900 font-bold text-base mb-2">10. Contacto</h2>
                            <p>Para consultas legales: <a href="mailto:legal@pro247.app" className="text-[#0F766E]">legal@pro247.app</a></p>
                        </section>
                    </div>
                </div>

                {/* Legal nav */}
                <div className="flex flex-wrap gap-3 mt-6 justify-center">
                    {[
                        { href: '/legal/privacy', label: 'Privacidad' },
                        { href: '/legal/cookies', label: 'Cookies' },
                        { href: '/legal/refunds', label: 'Reembolsos' },
                        { href: '/legal/dmca', label: 'DMCA' },
                    ].map(l => (
                        <Link key={l.href} href={l.href}
                            className="text-xs text-slate-500 hover:text-[#0F766E] transition-colors underline">
                            {l.label}
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
