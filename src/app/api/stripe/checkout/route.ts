import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { stripe, getOrCreateStripeCustomer, STRIPE_PLANS } from '@/lib/stripe';
import { prisma } from '@/lib/db';

const PLAN_KEYS = ['starter', 'pro', 'agency'] as const;

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { plan } = await req.json();
    if (!plan || !PLAN_KEYS.includes(plan)) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    const planData = STRIPE_PLANS[plan as keyof typeof STRIPE_PLANS];

    // Get user details for Stripe customer
    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const customerId = await getOrCreateStripeCustomer({
      userId: user.id,
      email: user.email,
      name: user.name ?? undefined,
    });

    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            recurring: { interval: 'month' },
            unit_amount: planData.priceMonthly,
            product_data: {
              name: `PrinceMarketing.ai ${planData.name}`,
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXTAUTH_URL || 'https://princemarketing.ai'}/dashboard?checkout=success`,
      cancel_url: `${process.env.NEXTAUTH_URL || 'https://princemarketing.ai'}/#pricing`,
      metadata: {
        userId: session.user.id,
        plan,
      },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (err) {
    console.error('[API] POST /api/stripe/checkout error:', err);
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
}
