import Stripe from "stripe";

let _stripe: Stripe | null = null;

// Lazily constructed so builds without STRIPE_SECRET_KEY set (e.g. CI, or
// routes that don't touch Stripe) don't throw at import time.
export function getStripe(): Stripe {
  if (_stripe) return _stripe;

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }

  _stripe = new Stripe(secretKey, {
    apiVersion: "2024-06-20",
  });
  return _stripe;
}
