import { Resend } from 'resend';
import { NextRequest, NextResponse } from 'next/server';

const FROM_EMAIL = 'onboarding@resend.dev';

type Locale = 'es' | 'en' | 'pt-BR';

// ── ONE universal template (table-based for Gmail compatibility) ──────────────
// Layout: Pro24/7YA brand text → colored header with logo badge → white body
// with feature list → CTA button → footer.
// Uses bgcolor on <td> so Gmail Android cannot strip the header color.

interface EmailParams {
  subject: string;
  headerTitle: string;
  headerSubtitle: string;
  bodyIntro: string;
  features: string[];
  ctaLabel: string;
  ctaUrl: string;
  footerNote?: string;
  locale: Locale;
}

function buildEmail(p: EmailParams): string {
  const featureRows = p.features.map(f => `
        <tr>
          <td width="22" valign="top" style="padding:0 0 12px 0;">
            <span style="color:#0891b2;font-size:15px;font-weight:700;">&#10003;</span>
          </td>
          <td valign="top" style="padding:0 0 12px 8px;">
            <span style="color:#334155;font-size:14px;line-height:1.55;font-family:'Segoe UI',system-ui,Arial,sans-serif;">${f}</span>
          </td>
        </tr>`).join('');

  const footer = p.footerNote ?? 'Pro24/7YA · Mensaje automático · Por favor no respondas.';

  return `<!DOCTYPE html>
<html lang="${p.locale}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',system-ui,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f1f5f9">
<tr><td align="center" style="padding:40px 16px;">
<table width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;">

  <!-- Brand name at top -->
  <tr><td height="8"></td></tr>

  <!-- Card wrapper -->
  <tr><td style="border-radius:20px;overflow:hidden;background:#ffffff;box-shadow:0 4px 24px rgba(0,0,0,0.10);">
    <table width="100%" cellpadding="0" cellspacing="0" border="0">

      <!-- ★ Colored header — bgcolor guarantees background in Gmail ★ -->
      <tr>
        <td bgcolor="#0882b0" style="padding:24px 28px;background:linear-gradient(135deg,#0882b0 0%,#0ea5e9 100%);">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <!-- Left: title + subtitle -->
              <td valign="middle" style="padding-right:12px;">
                <h1 style="color:#ffffff;font-size:20px;font-weight:800;margin:0 0 6px;letter-spacing:-0.3px;line-height:1.3;font-family:'Segoe UI',system-ui,Arial,sans-serif;">
                  ${p.headerTitle}
                </h1>
                <p style="color:rgba(255,255,255,0.88);font-size:13px;margin:0;font-family:'Segoe UI',system-ui,Arial,sans-serif;">
                  ${p.headerSubtitle}
                </p>
              </td>
              <!-- Right: real Pro24/7YA logo -->
              <td width="76" valign="middle" align="right">
                <img src="https://www.pro247ya.com/logo.png"
                     alt="Pro24/7YA"
                     width="72"
                     height="72"
                     style="display:block;" />
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- White body -->
      <tr>
        <td bgcolor="#ffffff" style="padding:32px 36px;background:#ffffff;">

          <!-- Intro text -->
          <p style="color:#334155;font-size:15px;line-height:1.7;margin:0 0 22px;font-family:'Segoe UI',system-ui,Arial,sans-serif;">
            ${p.bodyIntro}
          </p>

          <!-- Features table (table-based for email compat) -->
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:26px;">
            ${featureRows}
          </table>

          <!-- Divider -->
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:26px;">
            <tr><td height="1" bgcolor="#e2e8f0" style="font-size:0;line-height:0;">&nbsp;</td></tr>
          </table>

          <!-- CTA button -->
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr><td align="center">
              <a href="${p.ctaUrl}"
                 style="display:inline-block;background:#0891b2;color:#ffffff;font-weight:700;font-size:15px;padding:16px 42px;border-radius:12px;text-decoration:none;letter-spacing:0.2px;font-family:'Segoe UI',system-ui,Arial,sans-serif;">
                ${p.ctaLabel}
              </a>
            </td></tr>
          </table>

        </td>
      </tr>
    </table>
  </td></tr>

  <!-- Footer -->
  <tr><td align="center" style="padding:20px 16px 0;">
    <p style="color:#94a3b8;font-size:11px;text-align:center;margin:0;line-height:1.7;font-family:'Segoe UI',system-ui,Arial,sans-serif;">
      ${footer}
    </p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

// ── Welcome email per role & locale ──────────────────────────────────────────

function buildWelcomeEmail(
  name: string,
  role: 'client' | 'provider',
  locale: Locale,
  appUrl: string
): { subject: string; html: string } {

  type Config = {
    subject: string; headerTitle: string; headerSubtitle: string;
    bodyIntro: string; features: string[]; cta: string; footer: string;
  };

  const configs: Record<Locale, { client: Config; provider: Config }> = {
    'es': {
      client: {
        subject: `🎉 ¡Bienvenido a Pro24/7YA, ${name}!`,
        headerTitle: `¡Hola, ${name}! Bienvenido`,
        headerSubtitle: 'Tu cuenta para buscar servicios ya está lista',
        bodyIntro: 'Ya puedes explorar y conectar con profesionales cerca de ti:',
        features: [
          'Explora negocios y profesionales en tu ciudad',
          'Ve fotos, servicios y horarios de cada negocio',
          'Agenda citas en segundos directamente desde la app',
          'Contacta vía WhatsApp o llamada directa',
          'Lee reseñas reales de otros clientes',
        ],
        cta: 'Explorar servicios →',
        footer: 'Pro24/7YA · Mensaje automático · Por favor no respondas.',
      },
      provider: {
        subject: `🎉 ¡Bienvenido a Pro24/7YA, ${name}!`,
        headerTitle: `¡Hola, ${name}! Bienvenido`,
        headerSubtitle: 'Tu prueba gratuita de 7 días ha comenzado',
        bodyIntro: 'Gracias por unirte a Pro24/7YA. Tu negocio ahora puede:',
        features: [
          'Crear tu perfil profesional con galería y portafolio',
          'Aparecer en el mapa de Pro24/7YA para nuevos clientes',
          'Gestionar tu agenda y citas en línea',
          'Recibir contacto directo vía WhatsApp y llamadas',
          'Publicar tus servicios con precios y duración',
          '⏳ 7 días de prueba gratuita — sin tarjeta de crédito',
        ],
        cta: 'Crear mi perfil de negocio →',
        footer: 'Pro24/7YA · Mensaje automático · Por favor no respondas.',
      },
    },
    'en': {
      client: {
        subject: `🎉 Welcome to Pro24/7YA, ${name}!`,
        headerTitle: `Hi ${name}, welcome!`,
        headerSubtitle: 'Your account to find services is ready',
        bodyIntro: 'You can now explore and connect with professionals near you:',
        features: [
          'Explore businesses and professionals in your city',
          'View photos, services, and hours for each business',
          'Book appointments in seconds directly from the app',
          'Contact via WhatsApp or direct call',
          'Read real reviews from other clients',
        ],
        cta: 'Explore services →',
        footer: 'Pro24/7YA · Automated message · Please do not reply.',
      },
      provider: {
        subject: `🎉 Welcome to Pro24/7YA, ${name}!`,
        headerTitle: `Hi ${name}, welcome!`,
        headerSubtitle: 'Your 7-day free trial has started',
        bodyIntro: 'Thanks for joining Pro24/7YA. Your business can now:',
        features: [
          'Create your professional profile with gallery and portfolio',
          'Appear on the Pro24/7YA map for new clients',
          'Manage your schedule and online appointments',
          'Receive direct contact via WhatsApp and calls',
          'Publish your services with pricing and duration',
          '⏳ 7-day free trial — no credit card required',
        ],
        cta: 'Create my business profile →',
        footer: 'Pro24/7YA · Automated message · Please do not reply.',
      },
    },
    'pt-BR': {
      client: {
        subject: `🎉 Bem-vindo ao Pro24/7YA, ${name}!`,
        headerTitle: `Olá ${name}, seja bem-vindo!`,
        headerSubtitle: 'Sua conta para buscar serviços está pronta',
        bodyIntro: 'Agora você pode explorar e conectar com profissionais perto de você:',
        features: [
          'Explore negócios e profissionais na sua cidade',
          'Veja fotos, serviços e horários de cada negócio',
          'Agende consultas em segundos diretamente no app',
          'Entre em contato via WhatsApp ou ligação direta',
          'Leia avaliações reais de outros clientes',
        ],
        cta: 'Explorar serviços →',
        footer: 'Pro24/7YA · Mensagem automática · Por favor não responda.',
      },
      provider: {
        subject: `🎉 Bem-vindo ao Pro24/7YA, ${name}!`,
        headerTitle: `Olá ${name}, seja bem-vindo!`,
        headerSubtitle: 'Seu teste gratuito de 7 dias começou',
        bodyIntro: 'Obrigado por se juntar ao Pro24/7YA. Seu negócio agora pode:',
        features: [
          'Criar seu perfil profissional com galeria e portfólio',
          'Aparecer no mapa do Pro24/7YA para novos clientes',
          'Gerenciar sua agenda e consultas online',
          'Receber contato direto via WhatsApp e ligações',
          'Publicar seus serviços com preços e duração',
          '⏳ 7 dias de teste gratuito — sem cartão de crédito',
        ],
        cta: 'Criar meu perfil de negócio →',
        footer: 'Pro24/7YA · Mensagem automática · Por favor não responda.',
      },
    },
  };

  const c = (configs[locale] ?? configs['es'])[role];
  const html = buildEmail({
    subject: c.subject,
    headerTitle: c.headerTitle,
    headerSubtitle: c.headerSubtitle,
    bodyIntro: c.bodyIntro,
    features: c.features,
    ctaLabel: c.cta,
    ctaUrl: appUrl,
    footerNote: c.footer,
    locale,
  });
  return { subject: c.subject, html };
}

// ── Plan labels & features ────────────────────────────────────────────────────

const PLAN_LABEL: Record<string, string> = {
  premium: 'Premium',
  plus_team: 'Plus Equipo',
  vip: 'Pro24/7YA Colaboradores',
};

const PLAN_FEATURES: Record<string, string[]> = {
  premium: [
    'Perfil completo visible en el mapa de Pro24/7YA',
    'Galería de fotos y portafolio de trabajos',
    'Gestión de servicios con precios y duración',
    'Agenda y citas en línea ilimitadas',
    'WhatsApp y llamadas directas desde tu perfil',
    'Soporte por email',
  ],
  plus_team: [
    'Todo lo incluido en el plan Premium',
    'Hasta 5 miembros de equipo con perfiles individuales',
    'Agenda independiente por cada empleado',
    'Panel de administración de equipo',
    'Reportes de citas por miembro',
    'Soporte prioritario',
  ],
  vip: [
    'Acceso completo sin costo como Colaborador oficial',
    'Insignia exclusiva de Pro24/7YA Colaborador',
    'Influencia directa en el roadmap del producto',
    'Soporte VIP y acceso anticipado a nuevas funciones',
  ],
};

function buildPlanActivatedEmail(
  ownerName: string,
  businessName: string,
  category: string,
  plan: string,
  locale: Locale,
  appUrl: string
): { subject: string; html: string } {

  const planLabel = PLAN_LABEL[plan] ?? plan;
  const features = PLAN_FEATURES[plan] ?? PLAN_FEATURES.premium;

  const subjects: Record<Locale, string> = {
    'es': `Plan ${planLabel} activo — ${businessName}`,
    'en': `${planLabel} plan active — ${businessName}`,
    'pt-BR': `Plano ${planLabel} ativo — ${businessName}`,
  };
  const titles: Record<Locale, string> = {
    'es': `¡Tu plan ${planLabel} está activo!`,
    'en': `Your ${planLabel} plan is now active!`,
    'pt-BR': `Seu plano ${planLabel} está ativo!`,
  };
  const intros: Record<Locale, string> = {
    'es': `Hola <strong>${ownerName}</strong>, tu negocio <strong>${businessName}</strong> (${category}) ya tiene acceso completo a:`,
    'en': `Hi <strong>${ownerName}</strong>, your business <strong>${businessName}</strong> (${category}) now has full access to:`,
    'pt-BR': `Olá <strong>${ownerName}</strong>, seu negócio <strong>${businessName}</strong> (${category}) agora tem acesso completo a:`,
  };
  const ctas: Record<Locale, string> = {
    'es': 'Ver mi perfil de negocio →',
    'en': 'View my business profile →',
    'pt-BR': 'Ver meu perfil de negócio →',
  };
  const footers: Record<Locale, string> = {
    'es': 'Pro24/7YA · Notificación automática · Por favor no respondas.',
    'en': 'Pro24/7YA · Automated notification · Please do not reply.',
    'pt-BR': 'Pro24/7YA · Notificação automática · Por favor não responda.',
  };

  const subject = subjects[locale] ?? subjects['es'];
  const html = buildEmail({
    subject,
    headerTitle: titles[locale] ?? titles['es'],
    headerSubtitle: businessName,
    bodyIntro: intros[locale] ?? intros['es'],
    features,
    ctaLabel: ctas[locale] ?? ctas['es'],
    ctaUrl: appUrl,
    footerNote: footers[locale] ?? footers['es'],
    locale,
  });
  return { subject, html };
}

// ── Plan Paused email ─────────────────────────────────────────────────────────

function buildPlanPausedEmail(
  ownerName: string,
  businessName: string,
  reason: string,
  locale: Locale,
  appUrl: string
): { subject: string; html: string } {
  const subjects: Record<Locale, string> = {
    'es': `Tu cuenta en Pro24/7YA ha sido pausada — ${businessName}`,
    'en': `Your Pro24/7YA account has been paused — ${businessName}`,
    'pt-BR': `Sua conta no Pro24/7YA foi pausada — ${businessName}`,
  };
  const titles: Record<Locale, string> = {
    'es': 'Tu cuenta ha sido pausada temporalmente',
    'en': 'Your account has been temporarily paused',
    'pt-BR': 'Sua conta foi pausada temporariamente',
  };
  const intros: Record<Locale, string> = {
    'es': `Hola <strong>${ownerName}</strong>, el acceso al dashboard de <strong>${businessName}</strong> ha sido pausado. Motivo:<br/><br/><em style="color:#92400e;background:#fef3c7;padding:6px 10px;border-radius:6px;display:block;">${reason || 'Sin motivo especificado'}</em><br/>Para resolverlo, contáctanos:`,
    'en': `Hi <strong>${ownerName}</strong>, access to <strong>${businessName}</strong>'s dashboard has been paused. Reason:<br/><br/><em style="color:#92400e;background:#fef3c7;padding:6px 10px;border-radius:6px;display:block;">${reason || 'No reason specified'}</em><br/>To resolve this, contact us:`,
    'pt-BR': `Olá <strong>${ownerName}</strong>, o acesso ao painel de <strong>${businessName}</strong> foi pausado. Motivo:<br/><br/><em style="color:#92400e;background:#fef3c7;padding:6px 10px;border-radius:6px;display:block;">${reason || 'Sem motivo especificado'}</em><br/>Para resolver, entre em contato:`,
  };
  const features: Record<Locale, string[]> = {
    'es': ['Responde a este correo o escríbenos por WhatsApp', 'Nuestro equipo revisará tu caso en menos de 24h', 'Una vez resuelto, tu cuenta se reactivará de inmediato'],
    'en': ['Reply to this email or contact us via WhatsApp', 'Our team will review your case within 24h', 'Once resolved, your account will be reactivated immediately'],
    'pt-BR': ['Responda este e-mail ou entre em contato via WhatsApp', 'Nossa equipe analisará seu caso em menos de 24h', 'Assim que resolvido, sua conta será reativada imediatamente'],
  };
  const ctas: Record<Locale, string> = {
    'es': 'Contactar soporte →',
    'en': 'Contact support →',
    'pt-BR': 'Contatar suporte →',
  };

  const subject = subjects[locale] ?? subjects['es'];
  const html = buildEmail({
    subject,
    headerTitle: titles[locale] ?? titles['es'],
    headerSubtitle: businessName,
    bodyIntro: intros[locale] ?? intros['es'],
    features: features[locale] ?? features['es'],
    ctaLabel: ctas[locale] ?? ctas['es'],
    ctaUrl: 'mailto:soporte@pro247ya.com',
    footerNote: 'Pro24/7YA · Esta es una notificación importante sobre tu cuenta.',
    locale,
  });
  return { subject, html };
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[welcome-email] RESEND_API_KEY not set — skipped');
    return NextResponse.json({ ok: true, skipped: true });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    const body = await req.json();
    const { type, email, name, locale, role, data } = body as {
      type?: string;
      email: string;
      name: string;
      locale: Locale;
      role: 'client' | 'provider';
      data?: any;
    };

    if (!email || !name) {
      return NextResponse.json({ ok: false, error: 'email and name are required' }, { status: 400 });
    }

    const validLocale: Locale = ['es', 'en', 'pt-BR'].includes(locale) ? locale : 'es';
    const appUrl = `https://pro24-7ya.com/${validLocale}/`;

    let subject = '';
    let html = '';

    if (type === 'plan_activated') {
      const result = buildPlanActivatedEmail(
        name,
        data?.businessName ?? 'Tu negocio',
        data?.category ?? '',
        data?.plan ?? 'vip',
        validLocale,
        `https://pro24-7ya.com/${validLocale}/business/dashboard`
      );
      subject = result.subject;
      html = result.html;
    } else if (type === 'plan_paused') {
      const result = buildPlanPausedEmail(
        name,
        data?.businessName ?? 'Tu negocio',
        data?.reason ?? '',
        validLocale,
        `https://pro24-7ya.com/${validLocale}/business/dashboard`
      );
      subject = result.subject;
      html = result.html;
    } else {
      const result = buildWelcomeEmail(name, role ?? 'client', validLocale, appUrl);
      subject = result.subject;
      html = result.html;
    }

    const result = await resend.emails.send({ from: FROM_EMAIL, to: email, subject, html });
    return NextResponse.json({ ok: true, id: result.data?.id });

  } catch (err: any) {
    console.error('[welcome-email] Error:', err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 200 });
  }
}
