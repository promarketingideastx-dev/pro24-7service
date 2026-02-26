import { NextRequest, NextResponse } from 'next/server';
import { stripe, priceIdToPlan } from '@/lib/stripe';
import { StripeService } from '@/services/stripe.service';

const STRIPE_CONFIGURED = process.env.STRIPE_SECRET_KEY &&
    !process.env.STRIPE_SECRET_KEY.includes('placeholder');

// Required for raw body parsing (Stripe webhook signature verification)
export const config = { api: { bodyParser: false } };

export async function POST(req: NextRequest) {
    if (!STRIPE_CONFIGURED) {
        return NextResponse.json({ received: false }, { status: 200 });
    }

    const sig = req.headers.get('stripe-signature');
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!sig || !webhookSecret || webhookSecret.includes('placeholder')) {
        console.warn('Stripe webhook: missing signature or secret');
        return NextResponse.json({ received: false }, { status: 400 });
    }

    let event;
    try {
        const rawBody = await req.text();
        event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
    } catch (err: any) {
        console.error('Stripe webhook signature error:', err.message);
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    try {
        switch (event.type) {

            // ── Payment completed for first subscription ─────────────────
            case 'checkout.session.completed': {
                const session = event.data.object as any;
                const businessId = session.client_reference_id;
                const customerId = session.customer;

                if (businessId && customerId) {
                    // Save customer ID if not already saved
                    const existing = await StripeService.getStripeCustomerId(businessId);
                    if (!existing) {
                        await StripeService.saveStripeCustomerId(businessId, customerId);
                    }
                }
                break;
            }

            // ── Subscription activated or updated ────────────────────────
            case 'customer.subscription.created':
            case 'customer.subscription.updated': {
                const subscription = event.data.object as any;
                const customerId = subscription.customer;
                const priceId = subscription.items.data[0]?.price?.id;
                const status = subscription.status; // 'active', 'past_due', 'trialing', etc.

                // Find which business owns this customer
                const businessId = subscription.metadata?.businessId ||
                    await StripeService.findBusinessByCustomerId(customerId);

                if (businessId && (status === 'active' || status === 'trialing')) {
                    const plan = priceIdToPlan(priceId);
                    await StripeService.activatePlan(businessId, plan, subscription.id);
                    console.log(`✅ Stripe: Plan "${plan}" activated for business ${businessId}`);
                }
                break;
            }

            // ── Subscription cancelled/deleted → downgrade to free ────────
            case 'customer.subscription.deleted': {
                const subscription = event.data.object as any;
                const customerId = subscription.customer;

                const businessId = subscription.metadata?.businessId ||
                    await StripeService.findBusinessByCustomerId(customerId);

                if (businessId) {
                    await StripeService.deactivatePlan(businessId);
                    console.log(`⬇️  Stripe: Plan downgraded to free for business ${businessId}`);
                }
                break;
            }

            // ── Payment failed ────────────────────────────────────────────
            case 'invoice.payment_failed': {
                const invoice = event.data.object as any;
                console.warn(`💳 Stripe: Payment failed for customer ${invoice.customer}`);
                // Could add a notification to the business here
                break;
            }

            default:
                // Ignore other events
                break;
        }

        return NextResponse.json({ received: true });
    } catch (error: any) {
        console.error('Stripe webhook handler error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
