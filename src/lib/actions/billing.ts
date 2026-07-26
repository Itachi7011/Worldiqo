"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

const APP_URL = process.env.APP_URL ?? "http://localhost:3000";

type ActionResult = { error: string } | void;

export async function startCheckout(): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { error: "Sign in required." };

  if (!stripe || !process.env.STRIPE_PRICE_ID) {
    return { error: "Payments aren't configured yet — set STRIPE_SECRET_KEY and STRIPE_PRICE_ID." };
  }

  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id } });

  let customerId = user.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      metadata: { userId: user.id },
    });
    customerId = customer.id;
    await prisma.user.update({
      where: { id: user.id },
      data: { stripeCustomerId: customerId },
    });
  }

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
    success_url: `${APP_URL}/account?checkout=success`,
    cancel_url: `${APP_URL}/account?checkout=canceled`,
    client_reference_id: user.id,
  });

  if (!checkoutSession.url) return { error: "Stripe didn't return a checkout URL." };

  // redirect() throws internally by design — this is the supported way to
  // navigate from a Server Action, not an error condition.
  redirect(checkoutSession.url);
}

export async function openBillingPortal(): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { error: "Sign in required." };

  if (!stripe) {
    return { error: "Payments aren't configured yet — set STRIPE_SECRET_KEY." };
  }

  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id } });
  if (!user.stripeCustomerId) {
    return { error: "No billing account found yet — subscribe first." };
  }

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${APP_URL}/account`,
  });

  redirect(portalSession.url);
}
