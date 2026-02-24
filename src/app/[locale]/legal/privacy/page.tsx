import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Política de Privacidad | PRO24/7' };

export default function PrivacyPage() {
    const year = new Date().getFullYear();
    return (
        <div className="min-h-screen bg-[#F0F2F5] py-16 px-4">
            <div className="max-w-3xl mx-auto">
                <h1 className="text-2xl font-bold text-white mb-1">Política de Privacidad</h1>
                <p className="text-slate-400 text-sm mb-8">PRO24/7 · Última actualización: {year}</p>

                <div className="bg-[#0a1128] border border-slate-200 rounded-2xl p-8 space-y-6 text-sm text-slate-300 leading-relaxed">
                    <section>
                        <h2 className="text-slate-900 font-bold text-base mb-2">1. Datos que recopilamos</h2>
                        <p>Recopilamos: nombre, correo, teléfono, ubicación aproximada, historial de citas, fotos subidas voluntariamente, preferencias de servicios, dirección IP y datos de uso de la app.</p>
                    </section>
                    <section>
                        <h2 className="text-slate-900 font-bold text-base mb-2">2. Cómo usamos tus datos</h2>
                        <ul className="space-y-1 list-disc list-inside text-slate-400">
                            <li>Gestionar tu cuenta y reservas</li>
                            <li>Mejorar la plataforma (analytics anonimizado)</li>
                            <li>Enviarte notificaciones relevantes (puedes desactivarlas)</li>
                            <li>Seguridad y prevención de fraude</li>
                        </ul>
                    </section>
                    <section>
                        <h2 className="text-slate-900 font-bold text-base mb-2">3. Datos de ubicación</h2>
                        <p>Solicitamos permiso de ubicación para mostrar negocios cercanos y validar direcciones de negocios físicos. Si rechazas, usamos geolocalización por IP como alternativa. Nunca compartimos tu ubicación exacta con terceros.</p>
                    </section>
                    <section>
                        <h2 className="text-slate-900 font-bold text-base mb-2">4. Retención de datos</h2>
                        <p>Conservamos tus datos mientras tu cuenta esté activa. Al eliminar tu cuenta, eliminamos tus datos en un plazo máximo de 30 días, salvo obligación legal de retención.</p>
                    </section>
                    <section>
                        <h2 className="text-slate-900 font-bold text-base mb-2">5. Tus derechos</h2>
                        <p>Tienes derecho a acceder, corregir, exportar o eliminar tus datos. Para ejercerlos escribe a <a href="mailto:privacy@pro247.app" className="text-brand-neon-cyan">privacy@pro247.app</a>.</p>
                        <p className="mt-2 text-slate-500 text-xs">Aplica según la ley local: LGPD (Brasil), CCPA (California), LFPDPPP (México), GDPR (UE), Ley de Transparencia (Honduras).</p>
                    </section>
                    <section>
                        <h2 className="text-slate-900 font-bold text-base mb-2">6. Servicios de terceros</h2>
                        <p>Usamos Firebase (Google), Stripe, Pagadito y Google Maps. Cada uno tiene su propia política de privacidad.</p>
                    </section>
                </div>

                <div className="flex flex-wrap gap-3 mt-6 justify-center">
                    {['/legal/terms', '/legal/cookies', '/legal/refunds', '/legal/dmca'].map(href => (
                        <Link key={href} href={href} className="text-xs text-slate-500 hover:text-brand-neon-cyan transition-colors underline capitalize">
                            {href.split('/').pop()}
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
