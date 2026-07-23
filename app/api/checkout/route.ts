import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { planByFrequency } from "@/lib/plans";

interface CheckoutBody {
  fullName: string;
  email: string;
  phone: string;
  frequency: number;
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as Partial<CheckoutBody>;
  const { fullName, email, phone, frequency } = body;

  if (!fullName || !email || !phone || !frequency) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const plan = planByFrequency(frequency);
  if (!plan) {
    return NextResponse.json({ error: "Invalid plan frequency" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: venue, error: venueError } = await supabase
    .from("venues")
    .select("id")
    .eq("name", "UNTIL Liverpool Street")
    .single();

  if (venueError || !venue) {
    return NextResponse.json({ error: "Venue not configured" }, { status: 500 });
  }

  const stripe = getStripe();

  const { data: existingClient } = await supabase
    .from("clients")
    .select("stripe_customer_id")
    .eq("email", email)
    .maybeSingle();

  const stripeCustomerId =
    existingClient?.stripe_customer_id ??
    (
      await stripe.customers.create({
        name: fullName,
        email,
        phone,
      })
    ).id;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin;

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: stripeCustomerId,
    payment_method_types: ["bacs_debit"],
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "gbp",
          unit_amount: Math.round(plan.monthlyPrice * 100),
          recurring: { interval: "month" },
          product_data: {
            name: `CG Performance — ${plan.label}`,
            description: `${plan.frequency * plan.weeksPerMonth} x 30-minute sessions per month at UNTIL Liverpool Street`,
          },
        },
      },
    ],
    metadata: {
      full_name: fullName,
      phone,
      frequency: String(plan.frequency),
      venue_id: venue.id,
    },
    success_url: `${appUrl}/account?checkout=success`,
    cancel_url: `${appUrl}/signup?checkout=cancelled`,
  });

  if (!session.url) {
    return NextResponse.json({ error: "Could not create checkout session" }, { status: 500 });
  }

  return NextResponse.json({ url: session.url });
}
