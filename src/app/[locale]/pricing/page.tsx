'use client';

import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { Check, Zap, Users, Star, ArrowRight, MessageCircle } from 'lucide-react';

const PLANS = [
    {
        id: 'premium',
        name: 'Premium',
        price: 9.99,
        currency: 'USD',
        period: 'mes',
        description: 'Para profesionales independientes.',
        highlight: false,
        badge: null,
        features: [
            'Perfil de negocio completo',
            'Galería de fotos (hasta 20)',
            'Gestión de servicios y precios',
            'Agenda y citas en línea',
            '1 usuario administrador',
            'WhatsApp y llamadas directas',
            'Aparece en el mapa de Pro24/7YA',
            'Soporte por email',
        ],
        ctaText: 'Activar Premium',
        ctaStyle: 'border border-slate-300 text-slate-700 hover:bg-slate-50',
    },
    {
        id: 'plus_team',
        name: 'Plus Equipo',
        price: 14.99,
        currency: 'USD',
        period: 'mes',
        description: 'Para negocios con equipo de trabajo.',
        highlight: true,
        badge: 'Más Popular',
        features: [
            'Todo lo de Premium',
            'Hasta 5 miembros de equipo',
            'Perfiles individuales por empleado',
            'Agenda por empleado',
            'Panel de administración de equipo',
            'Reportes de citas por miembro',
            'Soporte prioritario',
        ],
        ctaText: 'Activar Plus Equipo',
        ctaStyle: 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:from-cyan-400 hover:to-blue-500 shadow-[0_0_30px_rgba(0,240,255,0.3)]',
    },
    {
        id: 'vip',
        name: 'Pro24/7YA Colaboradores',
        price: null,
        currency: null,
        period: null,
        description: 'Para personas que quieran hacer crecer Pro24/7YA a cambio de beneficios exclusivos.',
        highlight: false,
        badge: 'Por Invitación',
        features: [
            'Acceso completo sin costo',
            'Todos los beneficios del plan Plus Equipo',
            'Insignia oficial de Colaborador',
            'Membresía en grupo de colaboradores',
            'Influencia en el roadmap del producto',
            'Soporte VIP y acceso anticipado',
            'Beneficios exclusivos a negociar',
        ],
        ctaText: 'Enviar Propuesta',
        ctaStyle: 'border border-amber-500/50 text-amber-400 hover:bg-amber-500/10',
    },
];

export default function PricingPage() {
    const router = useRouter();
    const locale = useLocale();
    const lp = (path: string) => `/${locale}${path}`;

    const handlePlanSelect = (planId: string) => {
        if (planId === 'vip') {
            // Open WhatsApp with a pre-filled message
            const msg = encodeURIComponent('Hola, me gustaría enviar una propuesta para ser Colaborador de Pro24/7YA.');
            window.open(`https://wa.me/50499999999?text=${msg}`, '_blank');
        } else {
            // TODO: Integrate payment processor (Stripe/local gateway)
            // For now, navigate to dashboard — plan activation via CRM
            router.push(lp('/business/dashboard'));
        }
    };

    return (
        <div className="min-h-screen bg-[#F4F6F8] text-slate-900 relative overflow-hidden">
            {/* Background glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-cyan-500/5 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-purple-500/5 rounded-full blur-[100px] pointer-events-none" />

            <div className="relative z-10 max-w-6xl mx-auto px-4 py-16">

                {/* Header */}
                <div className="text-center mb-14">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 text-xs font-bold mb-6">
                        <Zap className="w-3 h-3 fill-current" />
                        7 días de prueba gratis · Sin tarjeta de crédito
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
                        Elige tu plan de{' '}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
                            Pro24/7YA
                        </span>
                    </h1>
                    <p className="text-slate-400 text-lg max-w-xl mx-auto">
                        Empieza gratis 7 días. Sin restricciones, sin tarjeta.
                        Al terminar, elige el plan que mejor se adapte a ti.
                    </p>
                </div>

                {/* Plans Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                    {PLANS.map((plan) => (
                        <div
                            key={plan.id}
                            className={`relative rounded-3xl p-8 border flex flex-col transition-all duration-300 ${plan.highlight
                                ? 'bg-gradient-to-b from-[#0f1f3d] to-[#0B0F19] border-cyan-500/50 shadow-[0_0_60px_rgba(0,240,255,0.1)] scale-[1.02]'
                                : 'bg-white/60 border-slate-200 hover:border-slate-300'
                                }`}
                        >
                            {/* Badge */}
                            {plan.badge && (
                                <div className={`absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold ${plan.highlight ? 'bg-cyan-500 text-black' : 'bg-amber-500/20 border border-amber-500/50 text-amber-400'
                                    }`}>
                                    {plan.badge}
                                </div>
                            )}

                            {/* Plan name & price */}
                            <div className="mb-6">
                                <h2 className={`text-xl font-bold mb-1 ${plan.highlight ? 'text-white' : 'text-slate-900'}`}>{plan.name}</h2>
                                <p className="text-slate-400 text-sm mb-4">{plan.description}</p>

                                {plan.price !== null ? (
                                    <div className="flex items-end gap-1">
                                        <span className={`text-4xl font-black ${plan.highlight ? 'text-white' : 'text-slate-900'}`}>${plan.price}</span>
                                        <span className="text-slate-400 text-sm mb-1">/ {plan.period}</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <MessageCircle className="w-5 h-5 text-amber-400" />
                                        <span className="text-amber-400 font-bold">Propuesta a negociar</span>
                                    </div>
                                )}
                            </div>

                            {/* Features */}
                            <ul className="space-y-3 flex-1 mb-8">
                                {plan.features.map((feature, i) => (
                                    <li key={i} className={`flex items-start gap-2 text-sm ${plan.highlight ? 'text-slate-300' : 'text-slate-600'}`}>
                                        <Check className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                                        {feature}
                                    </li>
                                ))}
                            </ul>

                            {/* CTA */}
                            <button
                                onClick={() => handlePlanSelect(plan.id)}
                                className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${plan.ctaStyle}`}
                            >
                                {plan.ctaText}
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>

                {/* Bottom note */}
                <div className="mt-12 text-center">
                    <p className="text-slate-500 text-sm">
                        Todos los planes incluyen los 7 días de prueba gratuita.
                        Los precios mostrados son en USD.
                        <br />
                        <span className="text-slate-400">
                            ¿Tienes preguntas?{' '}
                            <a
                                href="mailto:hola@pro247ya.com"
                                className="text-[#0F766E] hover:underline"
                            >
                                Contáctanos
                            </a>
                        </span>
                    </p>
                </div>

                {/* Apple/Google compliance note */}
                <div className="mt-6 text-center">
                    <p className="text-slate-600 text-xs">
                        Los pagos se procesan a través de nuestro sitio web. Pro24/7YA no procesa pagos dentro de la app.
                    </p>
                </div>
            </div>
        </div>
    );
}
