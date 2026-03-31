import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { stripe, getOrCreateStripeCustomer, STRIPE_PLANS } from '@/lib/stripe';
import { prisma } from '@/lib/db';
import { badRequest, unauthorized, serverError } from '@/lib/apiResponse';

const checkoutSchema = z.object({
  plan: z.enum(['starter', 'pro', 'agency']),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return unauthorized('You must be signed in to subscribe.');
    }

    const body = await request.json();
    const parsed = checkoutSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest('Invalid plan selection.');
    }

    const { plan, successUrl, cancelUrl } = parsed.data;
    const planConfig = STRIPE_PLANS[plan];

    // Get user details
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });
    if (!user) {
      return unauthorized('User not found.');
    }

    // Get or create Stripe customer
    const customerId = await getOrCreateStripeCustomer({
      userId: user.id,
      email: user.email,
      name: user.name ?? undefined,
    });

    // Create checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `PrinceMarketing.ai ${planConfig.name}`,
              description: `${planConfig.name} plan — monthly subscription`,
            },
            unit_amount: planConfig.priceMonthly,
            recurring: { interval: 'month' },
          },
          quantity: 1,
        },
      ],
      success_url: successUrl ?? `${process.env.NEXTAUTH_URL}/dashboard?checkout=success`,
      cancel_url: cancelUrl ?? `${process.env.NEXTAUTH_URL}/pricing?checkout=canceled`,
      metadata: {
        userId: user.id,
        plan,
      },
    });

    return NextResponse.json({
      type: 'success' as const,
      data: { checkoutUrl: checkoutSession.url },
    });
  } catch (err) {
    console.error('[API] POST /api/stripe/create-checkout error:', err);
    return serverError('Failed to create checkout session.');
  }
}
