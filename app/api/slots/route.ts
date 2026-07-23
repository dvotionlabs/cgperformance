import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthedClient } from "@/lib/auth";
import { generateDaySlots } from "@/lib/booking";

export async function GET(req: NextRequest) {
  const authed = await getAuthedClient();
  if (!authed) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const date = req.nextUrl.searchParams.get("date");
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "date=YYYY-MM-DD is required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("id, venue_id, status, venues(opens_at, closes_at)")
    .eq("client_id", authed.clientId)
    .in("status", ["active", "past_due"])
    .maybeSingle();

  if (!subscription) {
    return NextResponse.json({ error: "No active subscription" }, { status: 404 });
  }

  const venue = Array.isArray(subscription.venues) ? subscription.venues[0] : subscription.venues;
  if (!venue) {
    return NextResponse.json({ error: "Venue not found" }, { status: 500 });
  }

  const allSlots = generateDaySlots(date, venue.opens_at, venue.closes_at);

  const dayStart = `${date}T00:00:00.000Z`;
  const dayEnd = `${date}T23:59:59.999Z`;

  const { data: booked } = await supabase
    .from("session_bookings")
    .select("scheduled_at")
    .eq("venue_id", subscription.venue_id)
    .eq("status", "booked")
    .gte("scheduled_at", dayStart)
    .lte("scheduled_at", dayEnd);

  const takenTimes = new Set((booked ?? []).map((b) => b.scheduled_at));

  const slots = allSlots.map((iso) => ({
    scheduledAt: iso,
    available: !takenTimes.has(iso),
  }));

  return NextResponse.json({ slots });
}
