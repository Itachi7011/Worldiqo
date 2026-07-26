import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
  }

  const body = await req.text();
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    return NextResponse.json({ error: `Webhook signature verification failed: ${message}` }, {
      status: 400,
    });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.client_reference_id && session.subscription) {
        await prisma.user.update({
          where: { id: session.client_reference_id },
          data: {
            stripeSubscriptionId:
              typeof session.subscription === "string"
                ? session.subscription
                : session.subscription.id,
            subscriptionStatus: "active",
          },
        });
      }
      break;
    }

    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const status = mapStripeStatus(subscription.status);
      const periodEndUnix = subscription.items.data[0]?.current_period_end;
      await prisma.user.updateMany({
        where: { stripeCustomerId: subscription.customer as string },
        data: {
          subscriptionStatus: status,
          stripeSubscriptionId: subscription.id,
          currentPeriodEnd: periodEndUnix ? new Date(periodEndUnix * 1000) : null,
        },
      });
      break;
    }

    default:
      break; // ignore events we don't act on
  }

  return NextResponse.json({ received: true });
}

function mapStripeStatus(status: Stripe.Subscription.Status): string {
  if (status === "active" || status === "trialing") return "active";
  if (status === "past_due" || status === "unpaid") return "past_due";
  return "canceled";
}
