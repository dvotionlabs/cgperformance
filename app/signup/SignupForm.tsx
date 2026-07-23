"use client";

import { useState } from "react";
import { PLANS, formatGBP, type PlanFrequency } from "@/lib/plans";

export default function SignupForm() {
  const [frequency, setFrequency] = useState<PlanFrequency | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!frequency) {
      setError("Choose a weekly frequency to continue.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, email, phone, frequency }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Something went wrong");
      }

      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSubmitting(false);
    }
  }

  return (
    <form className="app-form" onSubmit={handleSubmit}>
      {error && <p className="form-error">{error}</p>}

      <div className="plan-grid">
        {PLANS.map((plan) => (
          <button
            type="button"
            key={plan.frequency}
            className="plan-option"
            data-selected={frequency === plan.frequency}
            onClick={() => setFrequency(plan.frequency)}
          >
            <div className="plan-label">{plan.label}</div>
            <div className="plan-price">{formatGBP(plan.monthlyPrice)}/mo</div>
          </button>
        ))}
      </div>

      <div className="field">
        <label htmlFor="su-name">Full name</label>
        <input
          id="su-name"
          type="text"
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="su-email">Email</label>
        <input
          id="su-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="su-phone">Phone</label>
        <input
          id="su-phone"
          type="tel"
          required
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </div>

      <p className="note">
        You&apos;ll set up a Direct Debit mandate on the next screen. Bacs
        requires a few working days&apos; notice, so your first payment is
        collected shortly after signup, not instantly — Stripe will show you
        the exact date before you confirm.
      </p>

      <button className="form-submit" type="submit" disabled={submitting}>
        {submitting ? "Redirecting…" : "Continue to payment →"}
      </button>
    </form>
  );
}
