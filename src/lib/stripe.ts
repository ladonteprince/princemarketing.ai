import Stripe from 'stripe';

const globalForStripe = globalThis as unknown as {
  stripe: Stripe | undefined;
};

export const stripe = globalForStripe.stripe ?? new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-03-25.dahlia',
  typescript: true,
});

if (process.env.NODE_ENV !== 'production') {
  globalForStripe.stripe = stripe;
}

// ─── Stripe Price IDs ───────────────────────────────────────────────────────
// These should be created in your Stripe dashboard and set here.
// For now, we define the mapping and create prices programmatically if needed.

export const STRIPE_PLANS = {
  starter: {
    name: 'Starter',
    priceMonthly: 2900, // $29 in cents
    lookup_key: 'starter_monthly',
  },
  pro: {
    name: 'Pro',
    priceMonthly: 14900, // $149 in cents
    lookup_key: 'pro_monthly',
  },
  agency: {
    name: 'Agency',
    priceMonthly: 49900, // $499 in cents
    lookup_key: 'agency_monthly',
  },
} as const;

export type StripePlanKey = keyof typeof STRIPE_PLANS;

// ─── Helper: Get or create a Stripe customer for a user ─────────────────────

export async function getOrCreateStripeCustomer(params: {
  userId: string;
  email: string;
  name?: string;
}): Promise<string> {
  // Check if we already have a Stripe customer
  const { prisma } = await import('@/lib/db');
  const subscription = await prisma.subscription.findUnique({
    where: { userId: params.userId },
  });

  if (subscription?.stripeCustomerId) {
    return subscription.stripeCustomerId;
  }

  // Create a new Stripe customer
  const customer = await stripe.customers.create({
    email: params.email,
    name: params.name ?? undefined,
    metadata: { userId: params.userId },
  });

  // Store the customer ID
  await prisma.subscription.upsert({
    where: { userId: params.userId },
    create: {
      userId: params.userId,
      stripeCustomerId: customer.id,
      status: 'inactive',
    },
    update: {
      stripeCustomerId: customer.id,
    },
  });

  return customer.id;
}
