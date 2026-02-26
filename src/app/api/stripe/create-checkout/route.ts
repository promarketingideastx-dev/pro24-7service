import { NextRequest, NextResponse } from 'next/server';
import { stripe, STRIPE_PRICE_IDS, StripePlan } from '@/lib/stripe';
import { StripeService } from '@/services/stripe.service';

const STRIPE_CONFIGURED = process.env.STRIPE_SECRET_KEY &&
    !process.env.STRIPE_SECRET_KEY.includes('placeholder');

export async function POST(req: NextRequest) {
    if (!STRIPE_CONFIGURED) {
        return NextResponse.json(
            { error: 'stripe_not_configured', message: 'Stripe no está configurado aún. Agrega tus llaves reales en .env.local' },
            { status: 503 }
        );
    }

    try {
        const { businessId, plan, successUrl, cancelUrl } = await req.json();

        if (!businessId || !plan || !successUrl || !cancelUrl) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const priceId = STRIPE_PRICE_IDS[plan as StripePlan];
        if (!priceId || priceId.includes('placeholder')) {
            return NextResponse.json(
                { error: 'price_not_configured', message: `Price ID para "${plan}" no configurado aún.` },
                { status: 503 }
            );
        }

        // Get or create Stripe customer
        let customerId = await StripeService.getStripeCustomerId(businessId);

        const session = await stripe.checkout.sessions.create({
            mode: 'subscription',
            payment_method_types: ['card'],
            line_items: [{ price: priceId, quantity: 1 }],
            client_reference_id: businessId,   // Used in webhook to identify business
            ...(customerId ? { customer: customerId } : {}),
            success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}&status=success`,
            cancel_url: `${cancelUrl}?status=cancelled`,
            subscription_data: {
                metadata: { businessId, plan },
            },
            metadata: { businessId, plan },
            allow_promotion_codes: true,
        });

        return NextResponse.json({ url: session.url, sessionId: session.id });
    } catch (error: any) {
        console.error('Stripe checkout error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
