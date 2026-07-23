import Nav from "@/components/Nav";
import SiteFooter from "@/components/SiteFooter";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatGBP } from "@/lib/plans";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const supabase = createAdminClient();

  const [{ data: subscriptions }, { data: bookings }, { data: failedPayments }] =
    await Promise.all([
      supabase
        .from("subscriptions")
        .select("id, status, next_billing_date, clients(full_name, email), plans(label, monthly_price), venues(name)")
        .in("status", ["active", "past_due", "incomplete", "paused"])
        .order("created_at", { ascending: false }),
      supabase
        .from("session_bookings")
        .select("id, scheduled_at, clients(full_name), venues(name)")
        .eq("status", "booked")
        .gte("scheduled_at", new Date().toISOString())
        .order("scheduled_at", { ascending: true })
        .limit(50),
      supabase
        .from("payments")
        .select("id, amount, created_at, subscriptions(clients(full_name, email))")
        .eq("status", "failed")
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

  return (
    <>
      <Nav />
      <main>
        <section style={{ borderTop: "none", paddingTop: 56 }}>
          <div className="wrap">
            <p className="idx">Admin</p>
            <h2>Active subscriptions</h2>
            <table className="data" style={{ marginBottom: 56 }}>
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Plan</th>
                  <th>Venue</th>
                  <th>Status</th>
                  <th>Next billing</th>
                </tr>
              </thead>
              <tbody>
                {(subscriptions ?? []).map((s) => {
                  const client = Array.isArray(s.clients) ? s.clients[0] : s.clients;
                  const plan = Array.isArray(s.plans) ? s.plans[0] : s.plans;
                  const venue = Array.isArray(s.venues) ? s.venues[0] : s.venues;
                  return (
                    <tr key={s.id}>
                      <td>
                        {client?.full_name}
                        <br />
                        <span style={{ color: "var(--stone)", fontSize: 12 }}>{client?.email}</span>
                      </td>
                      <td>
                        {plan?.label} ({formatGBP(plan?.monthly_price ?? 0)}/mo)
                      </td>
                      <td>{venue?.name}</td>
                      <td>
                        <span className="badge">{s.status}</span>
                      </td>
                      <td>{s.next_billing_date}</td>
                    </tr>
                  );
                })}
                {(subscriptions ?? []).length === 0 && (
                  <tr>
                    <td colSpan={5}>No subscriptions yet.</td>
                  </tr>
                )}
              </tbody>
            </table>

            <h2>Upcoming bookings</h2>
            <table className="data" style={{ marginBottom: 56 }}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Client</th>
                  <th>Venue</th>
                </tr>
              </thead>
              <tbody>
                {(bookings ?? []).map((b) => {
                  const client = Array.isArray(b.clients) ? b.clients[0] : b.clients;
                  const venue = Array.isArray(b.venues) ? b.venues[0] : b.venues;
                  const d = new Date(b.scheduled_at);
                  return (
                    <tr key={b.id}>
                      <td>{d.toLocaleDateString("en-GB")}</td>
                      <td>{d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</td>
                      <td>{client?.full_name}</td>
                      <td>{venue?.name}</td>
                    </tr>
                  );
                })}
                {(bookings ?? []).length === 0 && (
                  <tr>
                    <td colSpan={4}>No upcoming bookings.</td>
                  </tr>
                )}
              </tbody>
            </table>

            <h2>Failed payments needing attention</h2>
            <table className="data">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Amount</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {(failedPayments ?? []).map((p) => {
                  const subscription = Array.isArray(p.subscriptions)
                    ? p.subscriptions[0]
                    : p.subscriptions;
                  const client = subscription
                    ? Array.isArray(subscription.clients)
                      ? subscription.clients[0]
                      : subscription.clients
                    : null;
                  return (
                    <tr key={p.id}>
                      <td>
                        {client?.full_name}
                        <br />
                        <span style={{ color: "var(--stone)", fontSize: 12 }}>{client?.email}</span>
                      </td>
                      <td>{formatGBP(p.amount)}</td>
                      <td>{new Date(p.created_at).toLocaleDateString("en-GB")}</td>
                    </tr>
                  );
                })}
                {(failedPayments ?? []).length === 0 && (
                  <tr>
                    <td colSpan={3}>No failed payments outstanding.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
