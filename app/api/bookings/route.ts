import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthedClient } from "@/lib/auth";
import { currentWeekBounds } from "@/lib/booking";
import { PAYMENT_FAILURE_GRACE_PERIOD_DAYS } from "@/lib/config";

export async function GET() {
  const authed = await getAuthedClient();
  if (!authed) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data: bookings, error } = await supabase
    .from("session_bookings")
    .select("id, scheduled_at, duration_minutes, status")
    .eq("client_id", authed.clientId)
    .order("scheduled_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: "Failed to load bookings" }, { status: 500 });
  }

  return NextResponse.json({ bookings });
}

export async function POST(req: NextRequest) {
  const authed = await getAuthedClient();
  if (!authed) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { scheduledAt } = (await req.json()) as { scheduledAt?: string };
  if (!scheduledAt) {
    return NextResponse.json({ error: "scheduledAt is required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("id, venue_id, status, updated_at, plans(sessions_per_week)")
    .eq("client_id", authed.clientId)
    .in("status", ["active", "past_due"])
    .maybeSingle();

  if (!subscription) {
    return NextResponse.json({ error: "No active subscription" }, { status: 404 });
  }

  if (subscription.status === "past_due") {
    const pastDueSince = new Date(subscription.updated_at).getTime();
    const graceMs = PAYMENT_FAILURE_GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000;
    if (Date.now() - pastDueSince > graceMs) {
      return NextResponse.json(
        { error: "Payment overdue — please update your billing details before booking." },
        { status: 402 }
      );
    }
  }

  const plan = Array.isArray(subscription.plans) ? subscription.plans[0] : subscription.plans;
  const sessionsPerWeek = plan?.sessions_per_week ?? 0;

  const { start, end } = currentWeekBounds(new Date(scheduledAt));
  const { count } = await supabase
    .from("session_bookings")
    .select("id", { count: "exact", head: true })
    .eq("subscription_id", subscription.id)
    .in("status", ["booked", "completed"])
    .gte("scheduled_at", start.toISOString())
    .lt("scheduled_at", end.toISOString());

  if ((count ?? 0) >= sessionsPerWeek) {
    return NextResponse.json(
      { error: "You've used all your sessions for this week." },
      { status: 409 }
    );
  }

  const { data: booking, error } = await supabase
    .from("session_bookings")
    .insert({
      subscription_id: subscription.id,
      client_id: authed.clientId,
      venue_id: subscription.venue_id,
      scheduled_at: scheduledAt,
    })
    .select("id, scheduled_at, status")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "That slot was just booked — pick another." }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to create booking" }, { status: 500 });
  }

  return NextResponse.json({ booking }, { status: 201 });
}
