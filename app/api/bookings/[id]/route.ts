import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthedClient } from "@/lib/auth";

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const authed = await getAuthedClient();
  if (!authed) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const supabase = createAdminClient();

  const { data: booking, error } = await supabase
    .from("session_bookings")
    .update({ status: "cancelled" })
    .eq("id", params.id)
    .eq("client_id", authed.clientId)
    .select("id")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "Failed to cancel booking" }, { status: 500 });
  }
  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  return NextResponse.json({ cancelled: true });
}
