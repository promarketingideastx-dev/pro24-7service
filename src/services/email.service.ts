import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy_fallback_for_build');

interface EmailTemplatePayload {
    to: string;
    businessName: string;
    serviceName: string;
    date: string;
    time: string;
    bookingId: string;
    proofUrl?: string;
    locale?: string;
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
            
            if (data.error) {
                console.error('[Email Service] Resend returned error:', data.error);
                throw new Error(data.error.message);
            }
            
            return data;
        } catch (error) {
            console.error('Resend Email Error:', error);
            throw error;
        }
    },

    async sendBookingCreatedEmail(payload: EmailTemplatePayload) {
        const { to, businessName, serviceName, date, time, bookingId, locale } = payload;
        
        const html = `
            <div style="font-family: sans-serif; padding: 20px; color: #333;">
                <h2 style="color: #14B8A6;">Nueva Cita Recibida</h2>
                <p>Hola,</p>
                <p>Se ha recibido una nueva solicitud de cita para <strong>${businessName}</strong>.</p>
                
                <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 5px 0;"><strong>Servicio:</strong> ${serviceName}</p>
                    <p style="margin: 5px 0;"><strong>Fecha:</strong> ${date}</p>
                    <p style="margin: 5px 0;"><strong>Hora:</strong> ${time}</p>
                </div>

                <p>Por favor ingresa a tu agenda para confirmar o gestionar esta solicitud.</p>
                
                <div style="margin-top: 30px;">
                    <a href="https://www.pro247ya.com/${locale || 'es'}/business/agenda?bookingId=${bookingId}" style="background: #14B8A6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Revisar Cita</a>
                </div>
            </div>
        `;

        return this.sendEmail(to, `Nueva cita solicitada: ${serviceName}`, html);
    },

    async sendClientBookingCreatedEmail(payload: EmailTemplatePayload) {
        const { to, businessName, serviceName, date, time, bookingId, locale } = payload;
        
        const html = `
            <div style="font-family: sans-serif; padding: 20px; color: #333;">
                <h2 style="color: #3B82F6;">Cita Solicitada Exitosamente</h2>
                <p>Hola,</p>
                <p>Tu solicitud de cita con <strong>${businessName}</strong> ha sido recibida y está pendiente de confirmación.</p>
                
                <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 5px 0;"><strong>Servicio:</strong> ${serviceName}</p>
                    <p style="margin: 5px 0;"><strong>Fecha:</strong> ${date}</p>
                    <p style="margin: 5px 0;"><strong>Hora:</strong> ${time}</p>
                </div>

                <p>El proveedor revisará tu solicitud y recibirás una notificación cuando sea confirmada.</p>
                
                <div style="margin-top: 30px;">
                    <a href="https://www.pro247ya.com/${locale || 'es'}/user/profile?bookingId=${bookingId}" style="background: #3B82F6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Ver mis citas</a>
                </div>
            </div>
        `;

        return this.sendEmail(to, `Reservación solicitada: ${businessName}`, html);
    },

    async sendProofUploadedBusinessEmail(payload: EmailTemplatePayload) {
        const { to, businessName, serviceName, date, time, proofUrl, bookingId, locale } = payload;
        
        const imgHtml = proofUrl ? `
            <div style="margin: 20px 0; border: 1px solid #e2e8f0; padding: 10px; border-radius: 8px; background: white; text-align: center;">
                <p style="margin-top: 0; font-size: 14px; color: #64748b;">Comprobante adjunto:</p>
                <img src="${proofUrl}" style="max-width: 100%; max-height: 400px; border-radius: 4px;" alt="Comprobante de Pago" />
            </div>
        ` : '';

        const html = `
            <div style="font-family: sans-serif; padding: 20px; color: #333; background: #f8fafc;">
                <div style="background: white; padding: 20px; border-radius: 12px; max-width: 500px; margin: 0 auto; border: 1px solid #e2e8f0;">
                    <h2 style="color: #0F172A; text-align: center;">Nuevo Comprobante Recibido</h2>
                    <p>Hola,</p>
                    <p>El cliente ha subido un nuevo comprobante de pago para la cita de <strong>${serviceName}</strong>.</p>
                    
                    <div style="background: #f1f5f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <p style="margin: 5px 0;"><strong>Fecha:</strong> ${date}</p>
                        <p style="margin: 5px 0;"><strong>Hora:</strong> ${time}</p>
                    </div>

                    ${imgHtml}

                    <p style="text-align: center; margin-top: 25px;">
                        <a href="https://www.pro247ya.com/${locale || 'es'}/business/agenda?bookingId=${bookingId}" style="background: #14B8A6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Revisar y Aprobar</a>
                    </p>
                </div>
            </div>
        `;

        return this.sendEmail(to, `Comprobante Recibido: ${serviceName}`, html);
    },

    async sendBookingConfirmedEmail(payload: EmailTemplatePayload) {
        const { to, businessName, serviceName, date, time, bookingId, locale } = payload;
        
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
                    <a href="https://www.pro247ya.com/${locale || 'es'}/user/profile?bookingId=${bookingId}" style="background: #10B981; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Detalles de la cita</a>
                </div>
            </div>
        `;

        return this.sendEmail(to, `Cita Confirmada con ${businessName}`, html);
    },

    async sendBookingCancelledEmail(payload: EmailTemplatePayload) {
        const { to, businessName, serviceName, date, time, bookingId, locale } = payload;
        
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
        const { to, businessName, serviceName, date, time, bookingId, locale } = payload;
        
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
                    <a href="https://www.pro247ya.com/${locale || 'es'}/user/profile?bookingId=${bookingId}" style="background: #10B981; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Detalles de la cita</a>
                </div>
            </div>
        `;

        return this.sendEmail(to, `Pago Aprobado: ${businessName}`, html);
    },

    async sendPaymentProofRejectedEmail(payload: EmailTemplatePayload) {
        const { to, businessName, serviceName, date, time, bookingId, locale } = payload;
        
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
                
                 <div style="margin-top: 30px;">
                    <a href="https://www.pro247ya.com/${locale || 'es'}/user/profile?bookingId=${bookingId}" style="background: #EF4444; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Corregir o reenviar</a>
                </div>
            </div>
        `;

        return this.sendEmail(to, `Pago Rechazado: ${businessName}`, html);
    }
};
