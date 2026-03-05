import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { StripeService } from '@/services/stripe.service';

const STRIPE_CONFIGURED = process.env.STRIPE_SECRET_KEY &&
    !process.env.STRIPE_SECRET_KEY.includes('placeholder');

export async function POST(req: NextRequest) {
    if (!STRIPE_CONFIGURED) {
        return NextResponse.json(
            { error: 'stripe_not_configured', message: 'Stripe no está configurado aún.' },
            { status: 503 }
        );
    }

    try {
        const { businessId, returnUrl } = await req.json();

        if (!businessId || !returnUrl) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const customerId = await StripeService.getStripeCustomerId(businessId);
        if (!customerId) {
            return NextResponse.json(
                { error: 'no_customer', message: 'El negocio no tiene una suscripción activa.' },
                { status: 404 }
            );
        }

        const session = await stripe.billingPortal.sessions.create({
            customer: customerId,
            return_url: returnUrl,
        });

        return NextResponse.json({ url: session.url });
    } catch (error: any) {
        console.error('Stripe portal error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
