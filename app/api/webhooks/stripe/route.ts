import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

function mapSubscriptionStatus(
  status: Stripe.Subscription.Status
): "incomplete" | "active" | "past_due" | "paused" | "cancelled" {
  switch (status) {
    case "active":
    case "trialing":
      return "active";
    case "past_due":
    case "unpaid":
      return "past_due";
    case "paused":
      return "paused";
    case "canceled":
    case "incomplete_expired":
      return "cancelled";
    case "incomplete":
    default:
      return "incomplete";
  }
}

export async function POST(req: NextRequest) {
  const stripe = getStripe();
  const supabase = createAdminClient();

  const signature = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Missing webhook signature" }, { status: 400 });
  }

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error("Stripe webhook signature verification failed", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Idempotency: the unique constraint on stripe_event_id rejects redeliveries.
  const { error: insertError } = await supabase.from("webhook_events").insert({
    stripe_event_id: event.id,
    event_type: event.type,
    payload: event as unknown as Record<string, unknown>,
  });

  if (insertError) {
    if (insertError.code === "23505") {
      return NextResponse.json({ received: true, duplicate: true });
    }
    console.error("Failed to log webhook event", insertError);
    return NextResponse.json({ error: "Failed to log event" }, { status: 500 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== "subscription" || !session.subscription) break;

        const subscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription.id;
        const customerId =
          typeof session.customer === "string" ? session.customer : session.customer?.id;

        if (!customerId) break;

        const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);

        const email = session.customer_details?.email;
        const fullName = session.metadata?.full_name ?? email ?? "Unknown client";
        const phone = session.metadata?.phone ?? null;
        const frequency = Number(session.metadata?.frequency ?? 0);
        const venueId = session.metadata?.venue_id;

        if (!email || !frequency || !venueId) {
          console.error("checkout.session.completed missing required metadata", {
            email,
            frequency,
            venueId,
          });
          break;
        }

        const { data: client, error: clientError } = await supabase
          .from("clients")
          .upsert(
            { full_name: fullName, email, phone, stripe_customer_id: customerId },
            { onConflict: "email" }
          )
          .select("id")
          .single();

        if (clientError || !client) {
          console.error("Failed to upsert client", clientError);
          break;
        }

        const { data: plan, error: planError } = await supabase
          .from("plans")
          .select("id")
          .eq("sessions_per_week", frequency)
          .single();

        if (planError || !plan) {
          console.error("Failed to find plan for frequency", frequency, planError);
          break;
        }

        const nextBillingDate = stripeSubscription.current_period_end
          ? new Date(stripeSubscription.current_period_end * 1000).toISOString().slice(0, 10)
          : null;

        const { error: subError } = await supabase.from("subscriptions").upsert(
          {
            client_id: client.id,
            plan_id: plan.id,
            venue_id: venueId,
            stripe_subscription_id: subscriptionId,
            status: mapSubscriptionStatus(stripeSubscription.status),
            start_date: new Date().toISOString().slice(0, 10),
            next_billing_date: nextBillingDate,
          },
          { onConflict: "stripe_subscription_id" }
        );

        if (subError) {
          console.error("Failed to upsert subscription", subError);
        }
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const nextBillingDate = subscription.current_period_end
          ? new Date(subscription.current_period_end * 1000).toISOString().slice(0, 10)
          : null;

        const { error } = await supabase
          .from("subscriptions")
          .update({
            status: mapSubscriptionStatus(subscription.status),
            next_billing_date: nextBillingDate,
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", subscription.id);

        if (error) {
          console.error("Failed to update subscription status", error);
        }
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId =
          typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id;
        if (!subscriptionId) break;

        const { data: subscription } = await supabase
          .from("subscriptions")
          .select("id")
          .eq("stripe_subscription_id", subscriptionId)
          .single();

        if (!subscription) break;

        await supabase.from("payments").upsert(
          {
            subscription_id: subscription.id,
            stripe_invoice_id: invoice.id,
            amount: (invoice.amount_paid ?? 0) / 100,
            status: "paid",
            paid_at: new Date().toISOString(),
          },
          { onConflict: "stripe_invoice_id" }
        );

        await supabase
          .from("subscriptions")
          .update({ status: "active", updated_at: new Date().toISOString() })
          .eq("id", subscription.id);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId =
          typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id;
        if (!subscriptionId) break;

        const { data: subscription } = await supabase
          .from("subscriptions")
          .select("id")
          .eq("stripe_subscription_id", subscriptionId)
          .single();

        if (!subscription) break;

        await supabase.from("payments").upsert(
          {
            subscription_id: subscription.id,
            stripe_invoice_id: invoice.id,
            amount: (invoice.amount_due ?? 0) / 100,
            status: "failed",
          },
          { onConflict: "stripe_invoice_id" }
        );

        // updated_at marks when the subscription entered past_due — the
        // booking API uses it against PAYMENT_FAILURE_GRACE_PERIOD_DAYS to
        // decide when to stop letting the client book new sessions.
        await supabase
          .from("subscriptions")
          .update({ status: "past_due", updated_at: new Date().toISOString() })
          .eq("id", subscription.id);
        break;
      }

      default:
        break;
    }
  } catch (err) {
    console.error(`Error handling Stripe webhook event ${event.type}`, err);
    return NextResponse.json({ error: "Webhook handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
