import Nav from "@/components/Nav";
import SiteFooter from "@/components/SiteFooter";
import { PLANS, formatGBP } from "@/lib/plans";

export default function MarketingPage() {
  return (
    <>
      <Nav />

      <main>
        <section className="hero" id="top" style={{ borderTop: "none", paddingBottom: 0 }}>
          <div className="wrap">
            <p className="idx">Chris Gkoufas — CG Performance</p>
            <h1>Health and performance coaching.</h1>
            <p className="hero-sub">
              Personal training and online coaching, built around movement
              strategy — identifying how you move now, and whether that
              takes you toward health or toward performance.
            </p>
            <div className="hero-links">
              <a href="#pricing" className="txt-link">
                See pricing →
              </a>
              <a href="#philosophy" className="txt-link muted">
                How I work
              </a>
            </div>
          </div>
          <div className="hero-photo">
            <img
              src="/images/coaching-talk-bw.jpg"
              alt="Chris Gkoufas coaching a client"
            />
          </div>
        </section>

        <section id="philosophy">
          <div className="wrap">
            <p className="idx">01 — Philosophy</p>
            <h2>Movement strategy is behind all of it.</h2>
            <div className="measure">
              <p>
                My approach is built on the UHPC model, developed by Bill
                Hartman, who I&apos;ve spent the past two years studying
                directly under. It treats health and performance as one
                continuum rather than separate goals — the same framework
                applies whether someone&apos;s trying to get out of pain or
                trying to run faster.
              </p>
              <p>
                I work with each individual differently, because not
                everyone has the same goal. Every programme starts with
                identifying your current movement strategy — the pattern
                your body has learned to rely on. From there, I plan around
                what you&apos;re trying to achieve: building a more
                efficient movement strategy either for better movement
                quality and no pain, or for better performance in sport.
              </p>
            </div>
            <p className="note">
              Trained directly under Bill Hartman — UHPC Performance &amp;
              Conditioning and UHPC Assessment, 2 years.
            </p>
          </div>
        </section>

        <section id="pricing">
          <div className="wrap">
            <p className="idx">02 — Pricing</p>
            <h2>30-minute sessions, one flat rate.</h2>
            <div className="measure">
              <p>
                Every session is £50, 30 minutes, at UNTIL Liverpool Street.
                Pick a weekly frequency and pay monthly by Direct Debit —
                cancel anytime.
              </p>
            </div>
            <table className="rates">
              <tbody>
                {PLANS.map((plan) => (
                  <tr key={plan.frequency}>
                    <td>
                      {plan.label}
                      <div className="desc">
                        {plan.frequency * plan.weeksPerMonth} sessions per
                        month, UNTIL Liverpool Street.
                      </div>
                    </td>
                    <td className="fig">
                      {formatGBP(plan.monthlyPrice)}
                      <small>per month</small>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="note">
              Billed monthly by Bacs Direct Debit via Stripe. Your first
              payment is collected a few working days after signup, to
              allow for the Direct Debit mandate — you&apos;ll see the exact
              date before you confirm.
            </p>
            <div className="hero-links" style={{ marginTop: 32, marginBottom: 0 }}>
              <a href="/signup" className="txt-link">
                Choose a plan →
              </a>
            </div>
          </div>
        </section>

        <section id="locations">
          <div className="wrap">
            <p className="idx">03 — Locations</p>
            <h2>Trained at UNTIL.</h2>
            <div className="loc-list">
              <div className="loc-row">
                <img
                  src="/images/until-gym-floor-bw.jpg"
                  alt="UNTIL strength training floor"
                />
                <div>
                  <h3>UNTIL Marylebone</h3>
                  <p>Strength floor, free weights, private assessment room.</p>
                </div>
              </div>
              <div className="loc-row">
                <img
                  src="/images/until-treatment-room-bw.jpg"
                  alt="UNTIL assessment room"
                />
                <div>
                  <h3>UNTIL Liverpool Street</h3>
                  <p>
                    Strength floor, free weights, private assessment room.
                    Booking online is available here now.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="about">
          <div className="wrap">
            <p className="idx">04 — About</p>
            <h2>Where the knowledge comes from.</h2>
            <div className="about-grid">
              <div>
                <div className="measure">
                  <p>
                    I&apos;ve worked with professional and recreational
                    athletes, and with professionals from the city looking
                    to move and feel better outside of work. Across all of
                    them, the starting point is the same: identifying
                    movement strategy, then building a more efficient one
                    around what the client is trying to achieve.
                  </p>
                </div>
                <dl className="creds">
                  <div>
                    <dt>BSc, Sport and Exercise Science</dt>
                    <dd>Degree</dd>
                  </div>
                  <div>
                    <dt>MSc, Sports Marketing</dt>
                    <dd>Degree</dd>
                  </div>
                  <div>
                    <dt>Strength &amp; Conditioning, Level 4</dt>
                    <dd>Certification</dd>
                  </div>
                  <div>
                    <dt>UHPC Performance &amp; Conditioning Course</dt>
                    <dd>Bill Hartman</dd>
                  </div>
                  <div>
                    <dt>UHPC Assessment Course</dt>
                    <dd>Bill Hartman</dd>
                  </div>
                </dl>
              </div>
              <div className="about-photo">
                <img
                  src="/images/assessment-hip-bw.jpg"
                  alt="Hip mobility assessment session"
                />
              </div>
            </div>
          </div>
        </section>

        <section id="enquire">
          <div className="wrap">
            <p className="idx">05 — Enquire</p>
            <h2>Tell me what you&apos;re working on.</h2>
            <p className="measure" style={{ marginBottom: 28 }}>
              Ready for the 30-minute sessions at Liverpool Street?{" "}
              <a href="/signup" className="txt-link">
                Sign up directly
              </a>
              . For anything else — online coaching, general questions —
              use the form below.
            </p>
            <form
              className="enquire-form"
              action="https://formsubmit.co/chrisgkoufas.performance@gmail.com"
              method="POST"
            >
              <input
                type="hidden"
                name="_subject"
                value="New enquiry — CG Performance website"
              />
              <input type="hidden" name="_captcha" value="false" />
              <input
                type="text"
                name="_honey"
                style={{ display: "none" }}
                tabIndex={-1}
                autoComplete="off"
              />
              <div className="field">
                <label htmlFor="enq-email">Email</label>
                <input type="email" id="enq-email" name="email" required />
              </div>
              <div className="field">
                <label htmlFor="enq-phone">Phone</label>
                <input type="tel" id="enq-phone" name="phone" required />
              </div>
              <div className="field">
                <label htmlFor="enq-service">Service</label>
                <select id="enq-service" name="service" required defaultValue="">
                  <option value="" disabled>
                    Select a service
                  </option>
                  <option>Personal Training</option>
                  <option>Online Coaching</option>
                  <option>Initial Consultation</option>
                  <option>Not sure yet</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="enq-message">Message</label>
                <textarea id="enq-message" name="message" rows={5} required />
              </div>
              <button className="form-submit" type="submit">
                Send enquiry →
              </button>
            </form>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
