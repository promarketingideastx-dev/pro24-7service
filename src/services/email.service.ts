import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy_fallback_for_build');

interface EmailTemplatePayload {
    to: string;
    businessName: string;
    serviceName: string;
    date: string;
    time: string;
    bookingId: string;
}

export const EmailService = {
    async sendEmail(to: string, subject: string, html: string) {
        if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === 're_dummy_fallback_for_build') {
            const errMsg = '[Email Service] CRITICAL: RESEND_API_KEY is missing. Cannot send real emails.';
            console.error(errMsg);
            throw new Error(errMsg);
        }

        try {
            const data = await resend.emails.send({
                from: 'PRO24/7 <noreply@pro247ya.com>',
                to,
                subject,
                html,
            });
            return data;
        } catch (error) {
            console.error('Resend Email Error:', error);
            throw error;
        }
    },

    async sendBookingCreatedEmail(payload: EmailTemplatePayload) {
        const { to, businessName, serviceName, date, time, bookingId } = payload;
        
        const html = `
            <div style="font-family: sans-serif; padding: 20px; color: #333;">
                <h2 style="color: #14B8A6;">Cita Solicitada Exitosamente</h2>
                <p>Hola,</p>
                <p>Tu solicitud de cita con <strong>${businessName}</strong> ha sido recibida y está pendiente de confirmación.</p>
                
                <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 5px 0;"><strong>Servicio:</strong> ${serviceName}</p>
                    <p style="margin: 5px 0;"><strong>Fecha:</strong> ${date}</p>
                    <p style="margin: 5px 0;"><strong>Hora:</strong> ${time}</p>
                </div>

                <p>El proveedor revisará tu solicitud y recibirás una notificación cuando sea confirmada.</p>
                
                <div style="margin-top: 30px;">
                    <a href="https://www.pro247ya.com/bookings/${bookingId}" style="background: #14B8A6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Ver mi cita</a>
                </div>
            </div>
        `;

        return this.sendEmail(to, `Reservación solicitada: ${businessName}`, html);
    },

    async sendBookingConfirmedEmail(payload: EmailTemplatePayload) {
        const { to, businessName, serviceName, date, time, bookingId } = payload;
        
        const html = `
            <div style="font-family: sans-serif; padding: 20px; color: #333;">
                <h2 style="color: #10B981;">¡Tu cita ha sido confirmada!</h2>
                <p>Hola,</p>
                <p>El proveedor <strong>${businessName}</strong> ha confirmado tu cita.</p>
                
                <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 5px 0;"><strong>Servicio:</strong> ${serviceName}</p>
                    <p style="margin: 5px 0;"><strong>Fecha:</strong> ${date}</p>
                    <p style="margin: 5px 0;"><strong>Hora:</strong> ${time}</p>
                </div>

                <p>Recuerda asistir a tiempo. ¡Gracias por usar PRO24/7!</p>
                
                <div style="margin-top: 30px;">
                    <a href="https://www.pro247ya.com/bookings/${bookingId}" style="background: #10B981; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Ver mi cita</a>
                </div>
            </div>
        `;

        return this.sendEmail(to, `Cita Confirmada con ${businessName}`, html);
    },

    async sendBookingCancelledEmail(payload: EmailTemplatePayload) {
        const { to, businessName, serviceName, date, time, bookingId } = payload;
        
        const html = `
            <div style="font-family: sans-serif; padding: 20px; color: #333;">
                <h2 style="color: #EF4444;">Aviso de Cancelación</h2>
                <p>Hola,</p>
                <p>Lamentamos informarte que tu cita con <strong>${businessName}</strong> ha sido cancelada.</p>
                
                <div style="background: #fef2f2; padding: 15px; border-radius: 8px; border: 1px solid #fecaca; margin: 20px 0;">
                    <p style="margin: 5px 0;"><strong>Servicio:</strong> ${serviceName}</p>
                    <p style="margin: 5px 0;"><strong>Fecha:</strong> ${date}</p>
                    <p style="margin: 5px 0;"><strong>Hora:</strong> ${time}</p>
                </div>

                <p>Si fue un error o necesitas reprogramar, por favor contacta al proveedor directamente.</p>
            </div>
        `;

        return this.sendEmail(to, `Cita Cancelada: ${businessName}`, html);
    },

    async sendPaymentProofApprovedEmail(payload: EmailTemplatePayload) {
        const { to, businessName, serviceName, date, time, bookingId } = payload;
        
        const html = `
            <div style="font-family: sans-serif; padding: 20px; color: #333;">
                <h2 style="color: #10B981;">Pago Confirmado Exitosamente</h2>
                <p>Hola,</p>
                <p>El proveedor <strong>${businessName}</strong> ha verificado y aprobado tu comprobante de pago.</p>
                
                <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 5px 0;"><strong>Servicio:</strong> ${serviceName}</p>
                    <p style="margin: 5px 0;"><strong>Fecha:</strong> ${date}</p>
                    <p style="margin: 5px 0;"><strong>Hora:</strong> ${time}</p>
                </div>

                <p>Tu cita de pago está ahora debidamente confirmada. ¡Gracias por usar PRO24/7!</p>
                
                <div style="margin-top: 30px;">
                    <a href="https://www.pro247ya.com/bookings/${bookingId}" style="background: #10B981; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Ver mi cita</a>
                </div>
            </div>
        `;

        return this.sendEmail(to, `Pago Aprobado: ${businessName}`, html);
    },

    async sendPaymentProofRejectedEmail(payload: EmailTemplatePayload) {
        const { to, businessName, serviceName, date, time, bookingId } = payload;
        
        const html = `
            <div style="font-family: sans-serif; padding: 20px; color: #333;">
                <h2 style="color: #EF4444;">Comprobante de Pago Rechazado</h2>
                <p>Hola,</p>
                <p>El proveedor <strong>${businessName}</strong> no ha podido validar tu comprobante de pago o este era incorrecto.</p>
                
                <div style="background: #fef2f2; padding: 15px; border-radius: 8px; border: 1px solid #fecaca; margin: 20px 0;">
                    <p style="margin: 5px 0;"><strong>Servicio:</strong> ${serviceName}</p>
                    <p style="margin: 5px 0;"><strong>Fecha:</strong> ${date}</p>
                    <p style="margin: 5px 0;"><strong>Hora:</strong> ${time}</p>
                </div>

                <p>Por favor, ingresa nuevamente al detalle de tu cita y vuelve a subir el comprobante correcto, o contacta directamente al proveedor para aclarar el inconveniente.</p>
            </div>
        `;

        return this.sendEmail(to, `Pago Rechazado: ${businessName}`, html);
    }
};
