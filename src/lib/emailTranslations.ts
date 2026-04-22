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
            button: 'View in app',
            footer: 'You received this email because you are registered as a business on PRO24/7.'
        },
        bookingConfirmed: {
            subject: 'Your appointment was confirmed',
            title: 'Your booking was confirmed!',
            body: 'Thank you for your request. Your appointment is confirmed! The business will contact you shortly to finalize any details.',
            button: 'View appointment details',
            footer: 'Thank you for using PRO24/7.'
        },
        bookingCanceled: {
            subject: 'Your appointment could not be confirmed',
            title: 'Appointment Not Confirmed / Cancelled',
            body: 'We appreciate your interest. We are sorry to inform you that the business could not accept your request and the appointment was cancelled. Please try a different time or login to find other options.',
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
            button: 'Ver en aplicación',
            footer: 'Recibiste este correo porque estás registrado como negocio en PRO24/7.'
        },
        bookingConfirmed: {
            subject: 'Tu cita fue confirmada',
            title: '¡Tu cita fue confirmada!',
            body: 'Gracias por tu solicitud. ¡Tu cita ha sido confirmada! El negocio se pondrá en contacto contigo pronto para afinar cualquier detalle.',
            button: 'Ver detalles de cita',
            footer: 'Gracias por usar PRO24/7.'
        },
        bookingCanceled: {
            subject: 'Tu cita no pudo ser confirmada',
            title: 'Cita no confirmada / cancelada',
            body: 'Apreciamos tu interés. Lamentamos informarte que el negocio no pudo aceptar tu solicitud y la cita no pudo ser confirmada. Por favor, intenta en otro horario o ingresa a la aplicación para buscar otras opciones.',
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
            button: 'Ver no aplicativo',
            footer: 'Você recebeu este e-mail porque está registrado como negócio na PRO24/7.'
        },
        bookingConfirmed: {
            subject: 'Seu agendamento foi confirmado',
            title: 'Sua reserva foi confirmada!',
            body: 'Obrigado por sua solicitação. Seu agendamento foi confirmado! O negócio entrará em contato em breve para finalizar os detalhes.',
            button: 'Ver detalhes do agendamento',
            footer: 'Obrigado por usar a PRO24/7.'
        },
        bookingCanceled: {
            subject: 'Seu agendamento não pôde ser confirmado',
            title: 'Agendamento não confirmado / cancelado',
            body: 'Agradecemos seu interesse. Lamentamos informar que o negócio não pôde aceitar sua solicitação e o agendamento foi cancelado. Por favor, tente em outro horário ou acesse o aplicativo.',
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
