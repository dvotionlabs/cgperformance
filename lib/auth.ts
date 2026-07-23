import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface AuthedClient {
  userId: string;
  email: string;
  clientId: string;
}

// Client accounts aren't created until the Stripe webhook fires (see
// app/api/webhooks/stripe/route.ts), so the link between a Supabase Auth
// user and a `clients` row is by email rather than a stored user_id.
export async function getAuthedClient(): Promise<AuthedClient | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) return null;

  const admin = createAdminClient();
  const { data: client } = await admin
    .from("clients")
    .select("id")
    .eq("email", user.email)
    .maybeSingle();

  if (!client) return null;

  return { userId: user.id, email: user.email, clientId: client.id };
}
