import Stripe from "stripe";

// Lazily constructed so the app doesn't crash at import time in dev/build
// when STRIPE_SECRET_KEY isn't set yet — routes that need it check for null
// and return a clear error instead.
export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;
