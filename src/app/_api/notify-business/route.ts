import { Resend } from 'resend';
import { NextRequest, NextResponse } from 'next/server';

const FROM_EMAIL = 'onboarding@resend.dev';

// ── Helper row for table layouts ──────────────────────────────────────────────
function row(label: string, value: string) {
    return `
    <tr>
      <td style="padding:8px 0;color:#64748b;font-size:13px;width:140px;vertical-align:top;">${label}</td>
      <td style="padding:8px 0;color:#e2e8f0;font-size:13px;font-weight:500;">${value}</td>
    </tr>`;
}

// ── Template: new appointment → email to BUSINESS OWNER ──────────────────────
function newAppointmentHtml(data: {
    businessName: string;
    clientName: string;
    serviceName: string;
    dateLabel: string;
    dashboardUrl: string;
}) {
    return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0a1128;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:32px 16px;">
    <div style="background:linear-gradient(135deg,#0d1f3c,#0882b0);border:1px solid rgba(6,182,212,0.2);border-radius:16px;padding:28px 32px;margin-bottom:16px;">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:4px;">
        <span style="font-size:28px;">📅</span>
        <span style="font-size:20px;font-weight:700;color:#22d3ee;">Nueva Cita Agendada</span>
      </div>
      <p style="color:rgba(255,255,255,0.6);font-size:13px;margin:0;">Pro24/7YA · Panel del Negocio</p>
    </div>
    <div style="background:#0d1f3c;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:28px 32px;margin-bottom:16px;">
      <h2 style="color:#f1f5f9;font-size:20px;margin:0 0 20px;font-weight:700;">Hola, ${data.businessName} 👋</h2>
      <p style="color:#94a3b8;font-size:14px;margin:0 0 20px;">Tienes una nueva solicitud de cita:</p>
      <table style="width:100%;border-collapse:collapse;">
        ${row('👤 Cliente', data.clientName)}
        ${row('🛠️ Servicio', data.serviceName)}
        ${row('📅 Fecha / Hora', data.dateLabel)}
      </table>
    </div>
    <div style="text-align:center;margin-bottom:16px;">
      <a href="${data.dashboardUrl}"
         style="display:inline-block;background:linear-gradient(135deg,#06b6d4,#0ea5e9);color:#fff;font-weight:700;font-size:14px;padding:14px 32px;border-radius:12px;text-decoration:none;">
        Ver y responder cita →
      </a>
    </div>
    <p style="color:#334155;font-size:11px;text-align:center;margin:0;">Pro24/7YA · Notificación automática · No responder</p>
  </div>
</body>
</html>`;
}

// ── Template: appointment confirmed → email to CLIENT ─────────────────────────
function appointmentConfirmedHtml(data: {
    clientName: string;
    businessName: string;
    serviceName: string;
    dateLabel: string;
    businessPhone?: string;
}) {
    return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px;">
    <div style="background:linear-gradient(135deg,#065f46,#059669);border-radius:16px;padding:28px 32px;margin-bottom:16px;">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:4px;">
        <span style="font-size:28px;">✅</span>
        <span style="font-size:20px;font-weight:700;color:#fff;">¡Tu cita fue confirmada!</span>
      </div>
      <p style="color:rgba(255,255,255,0.75);font-size:13px;margin:0;">Pro24/7YA</p>
    </div>
    <div style="background:#ffffff;border-radius:16px;padding:28px 32px;margin-bottom:16px;box-shadow:0 4px 16px rgba(0,0,0,0.08);">
      <h2 style="color:#0f172a;font-size:18px;margin:0 0 8px;font-weight:700;">Hola, ${data.clientName} 👋</h2>
      <p style="color:#475569;font-size:14px;margin:0 0 20px;line-height:1.6;">
        Tu solicitud de cita con <strong>${data.businessName}</strong> ha sido confirmada.
      </p>
      <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
        <tr style="background:#f8fafc;">
          <td style="padding:10px 16px;color:#64748b;font-size:13px;width:120px;">📋 Servicio</td>
          <td style="padding:10px 16px;color:#0f172a;font-size:13px;font-weight:600;">${data.serviceName}</td>
        </tr>
        <tr>
          <td style="padding:10px 16px;color:#64748b;font-size:13px;">📅 Fecha</td>
          <td style="padding:10px 16px;color:#0f172a;font-size:13px;font-weight:600;">${data.dateLabel}</td>
        </tr>
        <tr style="background:#f8fafc;">
          <td style="padding:10px 16px;color:#64748b;font-size:13px;">🏢 Negocio</td>
          <td style="padding:10px 16px;color:#0f172a;font-size:13px;font-weight:600;">${data.businessName}</td>
        </tr>
      </table>
      <div style="margin-top:20px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px;">
        <p style="color:#166534;font-size:13px;margin:0;line-height:1.6;">
          Hola, gracias por agendar con nosotros. Nos pondremos en contacto contigo para afinar los detalles.
          Si tienes alguna pregunta, no dudes en escribirnos o llamarnos.
          ${data.businessPhone ? `<br/><strong>📞 ${data.businessPhone}</strong>` : ''}
        </p>
      </div>
    </div>
    <p style="color:#94a3b8;font-size:11px;text-align:center;margin:0;">Pro24/7YA · Mensaje automático · Por favor no respondas.</p>
  </div>
</body>
</html>`;
}

// ── Template: appointment rejected → email to CLIENT ─────────────────────────
function appointmentRejectedHtml(data: {
    clientName: string;
    businessName: string;
    serviceName: string;
    reason: string;
    businessPhone?: string;
}) {
    return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px;">
    <div style="background:linear-gradient(135deg,#7f1d1d,#dc2626);border-radius:16px;padding:28px 32px;margin-bottom:16px;">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:4px;">
        <span style="font-size:28px;">📋</span>
        <span style="font-size:20px;font-weight:700;color:#fff;">Solicitud de cita</span>
      </div>
      <p style="color:rgba(255,255,255,0.75);font-size:13px;margin:0;">Pro24/7YA · ${data.businessName}</p>
    </div>
    <div style="background:#ffffff;border-radius:16px;padding:28px 32px;margin-bottom:16px;box-shadow:0 4px 16px rgba(0,0,0,0.08);">
      <h2 style="color:#0f172a;font-size:18px;margin:0 0 8px;font-weight:700;">Hola, ${data.clientName}</h2>
      <p style="color:#475569;font-size:14px;margin:0 0 20px;line-height:1.6;">
        Gracias por contactar a <strong>${data.businessName}</strong>. Lamentablemente, en este momento no podemos confirmar tu cita para <strong>${data.serviceName}</strong>.
      </p>
      ${data.reason ? `
      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:16px;margin-bottom:16px;">
        <p style="color:#7f1d1d;font-size:13px;margin:0;font-weight:600;">Motivo:</p>
        <p style="color:#991b1b;font-size:13px;margin:8px 0 0;line-height:1.6;">${data.reason}</p>
      </div>` : ''}
      <p style="color:#475569;font-size:13px;margin:0;line-height:1.6;">
        Si tienes alguna pregunta, no dudes en escribirnos o llamarnos.
        ${data.businessPhone ? `<br/><strong>📞 ${data.businessPhone}</strong>` : ''}
      </p>
    </div>
    <p style="color:#94a3b8;font-size:11px;text-align:center;margin:0;">Pro24/7YA · Mensaje automático · Por favor no respondas.</p>
  </div>
</body>
</html>`;
}

// ── Route handler ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
    if (!process.env.RESEND_API_KEY) {
        console.warn('[notify-business] RESEND_API_KEY not set — email skipped');
        return NextResponse.json({ ok: true, skipped: true });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    try {
        const body = await req.json();
        const { type, to, data } = body as { type: string; to: string; data: any };

        if (!to) {
            return NextResponse.json({ ok: false, error: 'Missing recipient email' }, { status: 400 });
        }

        const now = new Date().toLocaleString('es-HN', {
            timeZone: 'America/Tegucigalpa',
            dateStyle: 'long',
            timeStyle: 'short',
        });

        let subject = '';
        let html = '';

        if (type === 'new_appointment') {
            subject = `📅 Nueva cita: ${data.clientName} — ${data.serviceName}`;
            html = newAppointmentHtml({
                ...data,
                dateLabel: data.dateLabel ?? now,
                dashboardUrl: data.dashboardUrl ?? 'https://pro247ya.com/es/business/dashboard',
            });
        } else if (type === 'appointment_confirmed') {
            subject = `✅ Tu cita fue confirmada — ${data.businessName}`;
            html = appointmentConfirmedHtml({ ...data, dateLabel: data.dateLabel ?? now });
        } else if (type === 'appointment_rejected') {
            subject = `Tu solicitud de cita — ${data.businessName}`;
            html = appointmentRejectedHtml(data);
        } else {
            return NextResponse.json({ ok: false, error: 'Unknown type' }, { status: 400 });
        }

        const result = await resend.emails.send({
            from: FROM_EMAIL,
            to,
            subject,
            html,
        });

        return NextResponse.json({ ok: true, id: result.data?.id });
    } catch (err: any) {
        console.error('[notify-business] Email error:', err);
        return NextResponse.json({ ok: false, error: err.message }, { status: 200 });
    }
}
