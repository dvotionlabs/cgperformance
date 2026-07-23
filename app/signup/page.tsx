import Nav from "@/components/Nav";
import SiteFooter from "@/components/SiteFooter";
import SignupForm from "./SignupForm";

export default function SignupPage() {
  return (
    <>
      <Nav />
      <main>
        <section style={{ borderTop: "none", paddingTop: 56 }}>
          <div className="wrap">
            <p className="idx">Sign up — UNTIL Liverpool Street</p>
            <h2>Choose your weekly frequency.</h2>
            <p className="measure" style={{ marginBottom: 40 }}>
              £50 per 30-minute session, billed monthly by Direct Debit.
              Cancel anytime.
            </p>
            <SignupForm />
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
