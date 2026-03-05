import { Resend } from 'resend';
import { NextRequest, NextResponse } from 'next/server';

// NOTE: Resend is instantiated inside the handler (not at module level)
// to prevent Next.js build from crashing when RESEND_API_KEY is not set.

const ADMIN_EMAIL = 'promarketingideas.tx@gmail.com';
const FROM_EMAIL = 'onboarding@resend.dev'; // Resend test domain — works without domain verification

// ── Email templates ──────────────────────────────────────────────────────────

function newBusinessHtml(data: {
  businessName: string;
  category: string;
  country: string;
  city: string;
  email: string;
  phone?: string;
  registeredAt: string;
}) {
  return `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0a1128;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:32px 16px;">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#0d1f3c,#162040);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:28px 32px;margin-bottom:16px;">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:4px;">
        <span style="font-size:28px;">🏢</span>
        <span style="font-size:20px;font-weight:700;color:#22d3ee;letter-spacing:-0.3px;">Nuevo Negocio Registrado</span>
      </div>
      <p style="color:#64748b;font-size:13px;margin:0;">PRO24/7 · Admin CRM</p>
    </div>

    <!-- Business Card -->
    <div style="background:#0d1f3c;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:28px 32px;margin-bottom:16px;">
      <h2 style="color:#f1f5f9;font-size:22px;margin:0 0 20px;font-weight:700;">${data.businessName}</h2>

      <table style="width:100%;border-collapse:collapse;">
        ${row('📂 Categoría', data.category || '—')}
        ${row('🌍 País', data.country || '—')}
        ${row('🏙️ Ciudad', data.city || '—')}
        ${row('📧 Email', data.email || '—')}
        ${data.phone ? row('📞 Teléfono', data.phone) : ''}
        ${row('🗓️ Registrado', data.registeredAt)}
      </table>
    </div>

    <!-- CTA -->
    <div style="text-align:center;margin-bottom:16px;">
      <a href="https://pro247.app/es/admin/businesses"
         style="display:inline-block;background:linear-gradient(135deg,#06b6d4,#0ea5e9);color:#fff;font-weight:700;font-size:14px;padding:14px 32px;border-radius:12px;text-decoration:none;">
        Ver en Admin CRM →
      </a>
    </div>

    <p style="color:#334155;font-size:11px;text-align:center;margin:0;">PRO24/7 · Notificación automática · No responder a este email</p>
  </div>
</body>
</html>`;
}

function planUpgradeHtml(data: {
  businessName: string;
  newPlan: string;
  oldPlan?: string;
  adminEmail: string;
  updatedAt: string;
}) {
  const PLAN_EMOJI: Record<string, string> = {
    free: '🔹', premium: '⭐', plus_team: '👥', vip: '👑',
  };
  const emoji = PLAN_EMOJI[data.newPlan] ?? '⭐';

  return `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0a1128;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:32px 16px;">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#1e1040,#2d1b69);border:1px solid rgba(167,139,250,0.2);border-radius:16px;padding:28px 32px;margin-bottom:16px;">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:4px;">
        <span style="font-size:28px;">${emoji}</span>
        <span style="font-size:20px;font-weight:700;color:#a78bfa;letter-spacing:-0.3px;">Plan Actualizado</span>
      </div>
      <p style="color:#64748b;font-size:13px;margin:0;">PRO24/7 · Admin CRM</p>
    </div>

    <!-- Info Card -->
    <div style="background:#0d1f3c;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:28px 32px;margin-bottom:16px;">
      <h2 style="color:#f1f5f9;font-size:22px;margin:0 0 20px;font-weight:700;">${data.businessName}</h2>
      <table style="width:100%;border-collapse:collapse;">
        ${data.oldPlan ? row('📦 Plan anterior', data.oldPlan.toUpperCase()) : ''}
        ${row('🆕 Plan nuevo', data.newPlan.toUpperCase())}
        ${row('👤 Actualizado por', data.adminEmail)}
        ${row('🗓️ Fecha', data.updatedAt)}
      </table>
    </div>

    <!-- CTA -->
    <div style="text-align:center;margin-bottom:16px;">
      <a href="https://pro247.app/es/admin/businesses"
         style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#a78bfa);color:#fff;font-weight:700;font-size:14px;padding:14px 32px;border-radius:12px;text-decoration:none;">
        Ver en Admin CRM →
      </a>
    </div>

    <p style="color:#334155;font-size:11px;text-align:center;margin:0;">PRO24/7 · Notificación automática · No responder a este email</p>
  </div>
</body>
</html>`;
}

// Helper: table row
function row(label: string, value: string) {
  return `
    <tr>
      <td style="padding:8px 0;color:#64748b;font-size:13px;width:140px;vertical-align:top;">${label}</td>
      <td style="padding:8px 0;color:#e2e8f0;font-size:13px;font-weight:500;">${value}</td>
    </tr>`;
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  if (!process.env.RESEND_API_KEY) {
    // Silently succeed in dev if key not set (don't break the app)
    console.warn('[notify-admin] RESEND_API_KEY not set — email skipped');
    return NextResponse.json({ ok: true, skipped: true });
  }

  // Instantiate inside the handler — safe from build-time crashes
  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    const body = await req.json();
    const { type, data } = body as { type: string; data: any };
    const now = new Date().toLocaleString('es-HN', {
      timeZone: 'America/Tegucigalpa',
      dateStyle: 'full',
      timeStyle: 'short',
    });

    let subject = '';
    let html = '';

    if (type === 'new_business') {
      subject = `🏢 Nuevo negocio: ${data.businessName ?? 'Sin nombre'}`;
      html = newBusinessHtml({ ...data, registeredAt: now });
    } else if (type === 'plan_upgrade') {
      subject = `⭐ Plan ${data.newPlan?.toUpperCase()} asignado a ${data.businessName ?? 'negocio'}`;
      html = planUpgradeHtml({ ...data, updatedAt: now });
    } else {
      return NextResponse.json({ ok: false, error: 'Unknown type' }, { status: 400 });
    }

    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: ADMIN_EMAIL,
      subject,
      html,
    });

    return NextResponse.json({ ok: true, id: result.data?.id });
  } catch (err: any) {
    console.error('[notify-admin] Email error:', err);
    // Don't return 500 — we don't want to break the user-facing flow
    return NextResponse.json({ ok: false, error: err.message }, { status: 200 });
  }
}
