import Nav from "@/components/Nav";
import SiteFooter from "@/components/SiteFooter";
import SignInForm from "@/components/SignInForm";
import BookingWidget from "./BookingWidget";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatGBP } from "@/lib/plans";

export default async function AccountPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return (
      <>
        <Nav />
        <main>
          <section style={{ borderTop: "none", paddingTop: 56 }}>
            <div className="wrap">
              <p className="idx">Account</p>
              <h2>Sign in to book sessions.</h2>
              <SignInForm />
            </div>
          </section>
        </main>
        <SiteFooter />
      </>
    );
  }

  const admin = createAdminClient();
  const { data: client } = await admin
    .from("clients")
    .select("id, full_name")
    .eq("email", user.email)
    .maybeSingle();

  const { data: subscription } = client
    ? await admin
        .from("subscriptions")
        .select("status, next_billing_date, plans(label, monthly_price), venues(name)")
        .eq("client_id", client.id)
        .in("status", ["active", "past_due", "incomplete"])
        .maybeSingle()
    : { data: null };

  const plan = subscription
    ? Array.isArray(subscription.plans)
      ? subscription.plans[0]
      : subscription.plans
    : null;
  const venue = subscription
    ? Array.isArray(subscription.venues)
      ? subscription.venues[0]
      : subscription.venues
    : null;

  return (
    <>
      <Nav />
      <main>
        <section style={{ borderTop: "none", paddingTop: 56 }}>
          <div className="wrap">
            <p className="idx">Account</p>
            <h2>Hi {client?.full_name ?? user.email}.</h2>

            {!subscription ? (
              <p className="measure">
                We couldn&apos;t find an active plan for this account yet.
                If you&apos;ve just signed up, this can take a minute while
                your payment confirms — refresh shortly, or{" "}
                <a href="/signup" className="txt-link">
                  sign up
                </a>{" "}
                if you haven&apos;t already.
              </p>
            ) : (
              <>
                <p className="measure">
                  {plan?.label} at {venue?.name} —{" "}
                  {formatGBP(plan?.monthly_price ?? 0)}/month.{" "}
                  <span className="badge">{subscription.status}</span>
                </p>
                {subscription.status === "past_due" && (
                  <p className="note">
                    Your last payment didn&apos;t go through. Please check
                    your Direct Debit details — bookings will pause if this
                    isn&apos;t resolved soon.
                  </p>
                )}
                <div style={{ marginTop: 40 }}>
                  <BookingWidget />
                </div>
              </>
            )}
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
