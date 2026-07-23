import { cookies } from "next/headers";
import { createServerClient, type CookieOptionsWithName } from "@supabase/ssr";

interface CookieToSet {
  name: string;
  value: string;
  options: CookieOptionsWithName;
}

// Bound to the request's auth cookies — use in server components, route
// handlers, and middleware wherever the *signed-in user's* session (and RLS)
// should apply, as opposed to lib/supabase/admin.ts's service-role bypass.
export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component render — middleware refreshes
            // the session cookie instead, so this can be safely ignored.
          }
        },
      },
    }
  );
}
