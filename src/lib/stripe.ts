import Stripe from 'stripe';

// Server-side Stripe client (only used in API routes / server components)
// Replace STRIPE_SECRET_KEY in .env.local with your real test key: sk_test_...
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder_replace_with_real_key';

export const stripe = new Stripe(stripeSecretKey, {
    apiVersion: '2026-02-25.clover',
    typescript: true,
});

// Stripe Price IDs — created in Stripe Dashboard → Products
// Replace these with your actual Price IDs after creating products in Stripe
export const STRIPE_PRICE_IDS = {
    premium: process.env.STRIPE_PRICE_PREMIUM || 'price_placeholder_premium',
    plus_team: process.env.STRIPE_PRICE_PLUS_TEAM || 'price_placeholder_plus_team',
} as const;

export type StripePlan = keyof typeof STRIPE_PRICE_IDS;

// Map Stripe Price ID → BusinessPlan
export function priceIdToPlan(priceId: string): 'premium' | 'plus_team' | 'free' {
    if (priceId === STRIPE_PRICE_IDS.premium) return 'premium';
    if (priceId === STRIPE_PRICE_IDS.plus_team) return 'plus_team';
    return 'free';
}
