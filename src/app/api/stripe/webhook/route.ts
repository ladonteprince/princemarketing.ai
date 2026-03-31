import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { prisma } from '@/lib/db';
import { PLANS } from '@/engine/PricingEngine';
import type Stripe from 'stripe';

// Stripe sends raw body — we need to verify the signature
export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (err) {
    console.error('[Stripe Webhook] Signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaid(invoice);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription);
        break;
      }

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }
  } catch (err) {
    console.error(`[Stripe Webhook] Error handling ${event.type}:`, err);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getSubscriptionPeriod(sub: Stripe.Subscription): {
  periodStart: Date;
  periodEnd: Date;
} {
  // In newer Stripe API versions, period data is on the subscription item
  const item = sub.items.data[0];
  if (item) {
    return {
      periodStart: new Date(item.current_period_start * 1000),
      periodEnd: new Date(item.current_period_end * 1000),
    };
  }
  // Fallback: use billing_cycle_anchor and created
  return {
    periodStart: new Date(sub.created * 1000),
    periodEnd: new Date((sub.created + 30 * 24 * 60 * 60) * 1000),
  };
}

// ─── Event Handlers ─────────────────────────────────────────────────────────

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  const plan = session.metadata?.plan as keyof typeof PLANS | undefined;

  if (!userId || !plan) {
    console.error('[Stripe Webhook] Missing userId or plan in checkout metadata');
    return;
  }

  const subscriptionId = session.subscription as string;
  const customerId = session.customer as string;

  // Fetch subscription details from Stripe
  const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);
  const priceId = stripeSubscription.items.data[0]?.price.id;
  const { periodStart, periodEnd } = getSubscriptionPeriod(stripeSubscription);

  // Update subscription record
  await prisma.subscription.upsert({
    where: { userId },
    create: {
      userId,
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      stripePriceId: priceId,
      status: 'active',
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
    },
    update: {
      stripeSubscriptionId: subscriptionId,
      stripePriceId: priceId,
      status: 'active',
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
    },
  });

  // Update user plan
  await prisma.user.update({
    where: { id: userId },
    data: { plan },
  });

  // Reset credits for the new billing period
  const planConfig = PLANS[plan];
  await prisma.creditBalance.upsert({
    where: { userId },
    create: {
      userId,
      imageCredits: planConfig.imageCredits,
      videoCredits: planConfig.videoCredits,
      copyCredits: planConfig.copyCredits === -1 ? 999999 : planConfig.copyCredits,
      resetAt: new Date(),
    },
    update: {
      imageCredits: planConfig.imageCredits,
      videoCredits: planConfig.videoCredits,
      copyCredits: planConfig.copyCredits === -1 ? 999999 : planConfig.copyCredits,
      resetAt: new Date(),
    },
  });
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;

  const subscription = await prisma.subscription.findFirst({
    where: { stripeCustomerId: customerId },
  });

  if (!subscription) {
    console.error(`[Stripe Webhook] No subscription found for customer ${customerId}`);
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: subscription.userId },
    select: { plan: true },
  });

  if (!user) return;

  const plan = user.plan as keyof typeof PLANS;
  if (!(plan in PLANS)) return;

  const planConfig = PLANS[plan];

  // Reset credits on each successful invoice payment (new billing cycle)
  await prisma.creditBalance.upsert({
    where: { userId: subscription.userId },
    create: {
      userId: subscription.userId,
      imageCredits: planConfig.imageCredits,
      videoCredits: planConfig.videoCredits,
      copyCredits: planConfig.copyCredits === -1 ? 999999 : planConfig.copyCredits,
      resetAt: new Date(),
    },
    update: {
      imageCredits: planConfig.imageCredits,
      videoCredits: planConfig.videoCredits,
      copyCredits: planConfig.copyCredits === -1 ? 999999 : planConfig.copyCredits,
      resetAt: new Date(),
    },
  });

  // Update subscription period from invoice line items
  if (invoice.lines.data[0]) {
    const line = invoice.lines.data[0];
    await prisma.subscription.update({
      where: { userId: subscription.userId },
      data: {
        status: 'active',
        currentPeriodStart: new Date(line.period.start * 1000),
        currentPeriodEnd: new Date(line.period.end * 1000),
      },
    });
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  const dbSubscription = await prisma.subscription.findFirst({
    where: { stripeCustomerId: customerId },
  });

  if (!dbSubscription) return;

  await prisma.subscription.update({
    where: { userId: dbSubscription.userId },
    data: { status: 'canceled' },
  });

  await prisma.user.update({
    where: { id: dbSubscription.userId },
    data: { plan: 'starter' },
  });
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  const dbSubscription = await prisma.subscription.findFirst({
    where: { stripeCustomerId: customerId },
  });

  if (!dbSubscription) return;

  const { periodStart, periodEnd } = getSubscriptionPeriod(subscription);

  const statusMap: Record<string, string> = {
    active: 'active',
    past_due: 'past_due',
  };

  await prisma.subscription.update({
    where: { userId: dbSubscription.userId },
    data: {
      status: statusMap[subscription.status] ?? 'inactive',
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
    },
  });
}
