import { Router, Request, Response, NextFunction } from 'express';
import Stripe from 'stripe';
import { authMiddleware } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';
import { Plan } from '@prisma/client';

const router = Router();

// Initialize Stripe
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

// Helper to extract period dates from Stripe subscription
function getPeriodDates(subscription: Stripe.Subscription) {
  // Stripe subscription has current_period_start/end on the raw object
  const sub = subscription as Stripe.Subscription & { current_period_start?: number; current_period_end?: number };
  return {
    start: new Date((sub.current_period_start || 0) * 1000),
    end: new Date((sub.current_period_end || 0) * 1000),
  };
}

// Price ID mapping (create these in Stripe Dashboard)
const PRICE_IDS: Record<string, { monthly: string; yearly: string }> = {
  PROFESSIONAL: {
    monthly: process.env.STRIPE_PRICE_PRO_MONTHLY || '',
    yearly: process.env.STRIPE_PRICE_PRO_YEARLY || '',
  },
  TEAM: {
    monthly: process.env.STRIPE_PRICE_TEAM_MONTHLY || '',
    yearly: process.env.STRIPE_PRICE_TEAM_YEARLY || '',
  },
};

// Plan hierarchy
const PLAN_ORDER: Record<string, number> = { FREE: 0, PROFESSIONAL: 1, TEAM: 2, ENTERPRISE: 3 };

// ============================================================
// POST /stripe/create-checkout — Create Stripe Checkout Session
// ============================================================
router.post('/create-checkout', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!stripe) {
      return res.status(503).json({ success: false, error: 'Payment service not configured' });
    }

    const userId = req.user.id;
    const { plan: targetPlan, interval = 'monthly' } = req.body;

    if (!targetPlan || !PRICE_IDS[targetPlan]) {
      return res.status(400).json({ success: false, error: 'Invalid plan' });
    }

    if (targetPlan === 'ENTERPRISE') {
      return res.status(400).json({ success: false, error: 'Enterprise plan requires contacting sales' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, plan: true },
    });

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    if (PLAN_ORDER[targetPlan] <= PLAN_ORDER[user.plan]) {
      return res.status(400).json({ success: false, error: 'Can only upgrade to a higher plan' });
    }

    const priceId = PRICE_IDS[targetPlan][interval as 'monthly' | 'yearly'];
    if (!priceId) {
      return res.status(400).json({ success: false, error: 'Price not configured for this plan' });
    }

    // Get or create Stripe customer
    let customerId: string;
    const existingSub = await prisma.subscription.findUnique({
      where: { userId },
    });

    if (existingSub?.stripeCustomerId) {
      customerId = existingSub.stripeCustomerId;
    } else {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: { userId },
      });
      customerId = customer.id;
    }

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.FRONTEND_URL}/app/pricing?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/app/pricing?canceled=true`,
      metadata: { userId, targetPlan },
      subscription_data: {
        metadata: { userId, targetPlan },
      },
    }, {
      idempotencyKey: `checkout_${userId}_${targetPlan}_${interval}`,
    });

    res.json({ success: true, data: { url: session.url } });
  } catch (err) { next(err); }
});

// ============================================================
// POST /stripe/create-portal — Create Stripe Customer Portal
// ============================================================
router.post('/create-portal', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!stripe) {
      return res.status(503).json({ success: false, error: 'Payment service not configured' });
    }

    const userId = req.user.id;
    const sub = await prisma.subscription.findUnique({
      where: { userId },
    });

    if (!sub?.stripeCustomerId) {
      return res.status(400).json({ success: false, error: 'No subscription found' });
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: sub.stripeCustomerId,
      return_url: `${process.env.FRONTEND_URL}/app/pricing`,
    });

    res.json({ success: true, data: { url: portalSession.url } });
  } catch (err) { next(err); }
});

// ============================================================
// GET /stripe/subscription — Get current subscription status
// ============================================================
router.get('/subscription', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.id;
    const sub = await prisma.subscription.findUnique({
      where: { userId },
    });

    if (!sub) {
      return res.json({
        success: true,
        data: { plan: 'FREE', status: 'active', hasSubscription: false },
      });
    }

    res.json({
      success: true,
      data: {
        plan: sub.plan,
        status: sub.status,
        hasSubscription: true,
        currentPeriodEnd: sub.currentPeriodEnd,
        cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
      },
    });
  } catch (err) { next(err); }
});

// ============================================================
// POST /stripe/webhook — Stripe Webhook Handler
// ============================================================
router.post('/webhook', async (req: Request, res: Response) => {
  if (!stripe) {
    return res.status(503).json({ error: 'Payment service not configured' });
  }

  const sig = req.headers['stripe-signature'];
  if (!sig) {
    return res.status(400).json({ error: 'Missing stripe-signature header' });
  }

  let event: Stripe.Event;

  try {
    // Use raw body for signature verification (set by express.raw() middleware)
    const rawBody = Buffer.isBuffer(req.body) ? req.body : JSON.stringify(req.body);
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET || ''
    );
  } catch (err: any) {
    console.error('[Stripe] Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  // Process event synchronously so Stripe retries on failure
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      case 'customer.subscription.paused':
        console.log(`[Stripe] Subscription paused: ${(event.data.object as Stripe.Subscription).id}`);
        break;
      case 'customer.subscription.resumed':
        console.log(`[Stripe] Subscription resumed: ${(event.data.object as Stripe.Subscription).id}`);
        break;
      case 'invoice.paid':
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      case 'charge.refunded':
        console.log(`[Stripe] Charge refunded: ${(event.data.object as Stripe.Charge).id}`);
        break;
      case 'charge.dispute.created':
        console.log(`[Stripe] Dispute created: ${(event.data.object as Stripe.Dispute).id}`);
        break;
      default:
        console.log(`[Stripe] Unhandled event type: ${event.type}`);
    }
  } catch (err) {
    console.error(`[Stripe] Error processing ${event.type}:`, err);
    return res.status(500).json({ error: `Error processing ${event.type}` });
  }

  res.json({ received: true });
});

// ============================================================
// Webhook Event Handlers
// ============================================================

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  const targetPlan = session.metadata?.targetPlan as Plan;

  if (!userId || !targetPlan) {
    console.error('[Stripe] Missing metadata in checkout session');
    return;
  }

  const subscriptionId = session.subscription as string;
  const customerId = session.customer as string;

  // Idempotency: skip if subscription already exists with this Stripe ID
  const existingSub = await prisma.subscription.findFirst({
    where: { stripeSubscriptionId: subscriptionId },
  });
  if (existingSub) {
    console.log(`[Stripe] Checkout already processed for subscription ${subscriptionId}`);
    return;
  }

  // Fetch current user plan and subscription details
  const [user, subscription] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { plan: true } }),
    stripe!.subscriptions.retrieve(subscriptionId),
  ]);

  if (!user) {
    console.error(`[Stripe] User ${userId} not found`);
    return;
  }

  const period = getPeriodDates(subscription);

  await prisma.$transaction([
    // Upsert subscription record
    prisma.subscription.upsert({
      where: { userId },
      create: {
        userId,
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId,
        stripePriceId: subscription.items.data[0]?.price.id,
        plan: targetPlan,
        status: subscription.status,
        currentPeriodStart: period.start,
        currentPeriodEnd: period.end,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      },
      update: {
        stripeSubscriptionId: subscriptionId,
        stripePriceId: subscription.items.data[0]?.price.id,
        plan: targetPlan,
        status: subscription.status,
        currentPeriodStart: period.start,
        currentPeriodEnd: period.end,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      },
    }),
    // Update user plan
    prisma.user.update({
      where: { id: userId },
      data: { plan: targetPlan },
    }),
    // Log plan change
    prisma.planChange.create({
      data: {
        userId,
        fromPlan: user.plan,
        toPlan: targetPlan,
        changedBy: 'stripe',
        reason: `Stripe checkout completed. Subscription: ${subscriptionId}`,
      },
    }),
  ]);

  console.log(`[Stripe] User ${userId} upgraded from ${user.plan} to ${targetPlan}`);
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId;
  if (!userId) return;

  const sub = await prisma.subscription.findUnique({ where: { userId } });
  if (!sub) return;

  // Determine plan from price ID
  const priceId = subscription.items.data[0]?.price.id;
  let plan: Plan = sub.plan;

  for (const [planKey, prices] of Object.entries(PRICE_IDS)) {
    if (prices.monthly === priceId || prices.yearly === priceId) {
      plan = planKey as Plan;
      break;
    }
  }

  const period = getPeriodDates(subscription);

  await prisma.$transaction([
    prisma.subscription.update({
      where: { userId },
      data: {
        plan,
        status: subscription.status,
        stripePriceId: priceId,
        currentPeriodStart: period.start,
        currentPeriodEnd: period.end,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      },
    }),
    prisma.user.update({
      where: { id: userId },
      data: { plan },
    }),
  ]);

  console.log(`[Stripe] Subscription updated for user ${userId}: ${plan}, status: ${subscription.status}`);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId;
  if (!userId) return;

  // Fetch current plan before resetting to FREE
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { plan: true } });
  const fromPlan = user?.plan || 'FREE';

  await prisma.$transaction([
    prisma.subscription.update({
      where: { userId },
      data: {
        status: 'canceled',
        plan: 'FREE',
      },
    }),
    prisma.user.update({
      where: { id: userId },
      data: { plan: 'FREE' },
    }),
    prisma.planChange.create({
      data: {
        userId,
        fromPlan,
        toPlan: 'FREE',
        changedBy: 'stripe',
        reason: 'Subscription canceled',
      },
    }),
  ]);

  console.log(`[Stripe] Subscription canceled for user ${userId}, was ${fromPlan}`);
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  // Stripe Invoice has subscription field on the raw object
  const subscriptionId = (invoice as Stripe.Invoice & { subscription?: string }).subscription as string;
  if (!subscriptionId) return;

  const sub = await prisma.subscription.findFirst({
    where: { stripeSubscriptionId: subscriptionId },
  });

  if (!sub) return;

  // Extend access period
  const subscription = await stripe!.subscriptions.retrieve(subscriptionId);
  const period = getPeriodDates(subscription);
  await prisma.subscription.update({
    where: { id: sub.id },
    data: {
      status: 'active',
      currentPeriodStart: period.start,
      currentPeriodEnd: period.end,
    },
  });

  console.log(`[Stripe] Invoice paid for subscription ${subscriptionId}`);
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const subscriptionId = (invoice as Stripe.Invoice & { subscription?: string }).subscription as string;
  if (!subscriptionId) return;

  const sub = await prisma.subscription.findFirst({
    where: { stripeSubscriptionId: subscriptionId },
  });

  if (!sub) return;

  await prisma.subscription.update({
    where: { id: sub.id },
    data: { status: 'past_due' },
  });

  console.log(`[Stripe] Payment failed for subscription ${subscriptionId}`);
}

export default router;
