// src/lib/emailTranslations.ts

export type EmailLocale = 'en' | 'es' | 'pt';

/**
 * Agnostic server-side translation dictionary for Email templates.
 * Bypasses next-intl since emails are sent from a Node serverless env (Cron/Resend).
 */
export const EmailTranslations = {
    en: {
        bookingCreated: {
            subject: 'New Booking Request - PRO24/7',
            title: 'New Booking Request',
            body: 'You have received a new booking from {clientName} for the service: {serviceName}. Please log in to your dashboard to confirm or reject this request.',
            button: 'View Booking',
            footer: 'You received this email because you are registered as a business on PRO24/7.'
        },
        bookingConfirmed: {
            subject: 'Booking Confirmed - PRO24/7',
            title: 'Your Booking was Confirmed!',
            body: '{businessName} has just confirmed your booking for {serviceName}. You can contact them or check details in your client dashboard.',
            button: 'View My Appointments',
            footer: 'Thank you for using PRO24/7.'
        },
        bookingCanceled: {
            subject: 'Booking Cancelled - PRO24/7',
            title: 'Booking Cancelled',
            body: 'We are sorry! {businessName} had to cancel your booking for {serviceName}. Please log in to request a different time.',
            button: 'Find and Rebook',
            footer: 'Thank you for using PRO24/7.'
        },
        bookingClientAcknowledged: {
            subject: 'Booking Request Sent - PRO24/7',
            title: 'Your request was sent!',
            body: 'We have sent your booking request to {businessName} for {serviceName}. You will be notified once they confirm it.',
            button: 'View Status',
            footer: 'Thank you for using PRO24/7.'
        }
    },
    es: {
        bookingCreated: {
            subject: 'Nueva Solicitud de Cita - PRO24/7',
            title: 'Nueva Solicitud de Cita',
            body: 'Has recibido una nueva solicitud de {clientName} para el servicio: {serviceName}. Por favor ingresa a tu panel para confirmar o rechazar esta solicitud.',
            button: 'Ver Cita',
            footer: 'Recibiste este correo porque estás registrado como negocio en PRO24/7.'
        },
        bookingConfirmed: {
            subject: 'Cita Confirmada - PRO24/7',
            title: '¡Tu Cita fue Confirmada!',
            body: '{businessName} acaba de confirmar tu cita para {serviceName}. Puedes contactarlos o ver detalles en tu panel de cliente.',
            button: 'Ver mis Citas',
            footer: 'Gracias por usar PRO24/7.'
        },
        bookingCanceled: {
            subject: 'Cita Cancelada - PRO24/7',
            title: 'Cita Cancelada',
            body: '¡Lo sentimos! {businessName} tuvo que cancelar tu cita para {serviceName}. Por favor ingresa para solicitar un horario distinto.',
            button: 'Buscar y Reagendar',
            footer: 'Gracias por usar PRO24/7.'
        },
        bookingClientAcknowledged: {
            subject: 'Solicitud de Cita Enviada - PRO24/7',
            title: '¡Tu solicitud fue enviada!',
            body: 'Hemos enviado tu solicitud a {businessName} para {serviceName}. Serás notificado(a) una vez que la confirmen.',
            button: 'Ver Estado',
            footer: 'Gracias por usar PRO24/7.'
        }
    },
    pt: {
        bookingCreated: {
            subject: 'Nova Solicitação de Reserva - PRO24/7',
            title: 'Nova Solicitação de Reserva',
            body: 'Você recebeu uma nova solicitação de {clientName} para o serviço: {serviceName}. Por favor, acesse seu painel para confirmar ou rejeitar.',
            button: 'Ver Reserva',
            footer: 'Você recebeu este e-mail porque está registrado como negócio na PRO24/7.'
        },
        bookingConfirmed: {
            subject: 'Reserva Confirmada - PRO24/7',
            title: 'Sua Reserva foi Confirmada!',
            body: '{businessName} acabou de confirmar sua reserva para {serviceName}. Você pode contatá-los ou ver os detalhes em seu painel.',
            button: 'Ver Minhas Consultas',
            footer: 'Obrigado por usar a PRO24/7.'
        },
        bookingCanceled: {
            subject: 'Reserva Cancelada - PRO24/7',
            title: 'Reserva Cancelada',
            body: 'Sentimos muito! {businessName} teve que cancelar sua reserva para {serviceName}. Por favor, acesse para solicitar outro horário.',
            button: 'Procurar e Reagendar',
            footer: 'Obrigado por usar a PRO24/7.'
        },
        bookingClientAcknowledged: {
            subject: 'Solicitação de Reserva Enviada - PRO24/7',
            title: 'Sua solicitação foi enviada!',
            body: 'Enviamos sua solicitação para {businessName} sobre {serviceName}. Você será notificado(a) assim que houver confirmação.',
            button: 'Ver Status',
            footer: 'Obrigado por usar a PRO24/7.'
        }
    }
};

/** Helper to extract safe locale and interpolate */
export function getEmailDict(locale: string = 'es') {
    const safeLoc = (['en', 'es', 'pt', 'pt-BR'].includes(locale) ? (locale === 'pt-BR' ? 'pt' : locale) : 'es') as EmailLocale;
    const dict = EmailTranslations[safeLoc];

    return {
        t: (key: keyof typeof dict, params?: Record<string, string>) => {
            const block = dict[key];
            if (!block) return dict.bookingCreated; // safe fallback

            if (!params) return block;

            // Interpolate string logic
            const replaceInString = (str: string) => {
                let res = str;
                for (const [k, v] of Object.entries(params)) {
                    res = res.replace(new RegExp(`{${k}}`, 'g'), v);
                }
                return res;
            };

            return {
                subject: replaceInString(block.subject),
                title: replaceInString(block.title),
                body: replaceInString(block.body),
                button: replaceInString(block.button),
                footer: replaceInString(block.footer),
            };
        }
    }
}
