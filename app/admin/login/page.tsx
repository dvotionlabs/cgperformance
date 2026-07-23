import Nav from "@/components/Nav";
import SiteFooter from "@/components/SiteFooter";
import SignInForm from "@/components/SignInForm";

export default function AdminLoginPage() {
  return (
    <>
      <Nav />
      <main>
        <section style={{ borderTop: "none", paddingTop: 56 }}>
          <div className="wrap">
            <p className="idx">Admin</p>
            <h2>Sign in.</h2>
            <SignInForm redirectTo="/admin" />
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
