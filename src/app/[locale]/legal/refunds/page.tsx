import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Política de Reembolsos | PRO24/7' };

export default function RefundsPage() {
    return (
        <div className="min-h-screen bg-[#F0F2F5] py-16 px-4">
            <div className="max-w-3xl mx-auto">
                <h1 className="text-2xl font-bold text-white mb-1">Política de Reembolsos</h1>
                <p className="text-slate-400 text-sm mb-8">PRO24/7 · Última actualización: {new Date().getFullYear()}</p>

                <div className="bg-[#0a1128] border border-slate-200 rounded-2xl p-8 space-y-6 text-sm text-slate-300 leading-relaxed">
                    <section>
                        <h2 className="text-white font-bold text-base mb-2">Suscripciones (Planes Premium/Plus/VIP)</h2>
                        <ul className="space-y-2 list-disc list-inside text-slate-400">
                            <li>Los planes se cobran mensual o anualmente de forma anticipada.</li>
                            <li>Puedes cancelar en cualquier momento — el plan continúa hasta el fin del período pagado.</li>
                            <li>No ofrecemos reembolso proporcional por los días no utilizados, salvo por fallo técnico documentado atribuible a PRO24/7.</li>
                            <li>Reembolsos por compras en App Store o Google Play se gestionan según las políticas de Apple/Google.</li>
                        </ul>
                    </section>
                    <section>
                        <h2 className="text-white font-bold text-base mb-2">Excepciones donde sí aplica reembolso</h2>
                        <ul className="space-y-2 list-disc list-inside text-slate-400">
                            <li>Cobro duplicado por error técnico</li>
                            <li>Servicio no disponible por más de 72 horas continuas</li>
                            <li>Periodo de gracia de 48 horas para nuevas suscripciones (primer cargo)</li>
                        </ul>
                    </section>
                    <section>
                        <h2 className="text-white font-bold text-base mb-2">Proceso de solicitud</h2>
                        <p>Escribe a <a href="mailto:billing@pro247.app" className="text-brand-neon-cyan">billing@pro247.app</a> con tu ID de transacción y motivo. Respondemos en un máximo de 5 días hábiles.</p>
                    </section>
                </div>

                <div className="flex flex-wrap gap-3 mt-6 justify-center">
                    {['/legal/terms', '/legal/privacy', '/legal/cookies', '/legal/dmca'].map(href => (
                        <Link key={href} href={href} className="text-xs text-slate-500 hover:text-brand-neon-cyan transition-colors underline capitalize">
                            {href.split('/').pop()}
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
