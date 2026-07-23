"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function SignInForm({ redirectTo = "/account" }: { redirectTo?: string }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}${redirectTo}` },
    });

    if (error) {
      setError(error.message);
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <p className="measure">
        Check your inbox — we&apos;ve sent a sign-in link to <strong>{email}</strong>.
      </p>
    );
  }

  return (
    <form className="app-form" onSubmit={handleSubmit}>
      {error && <p className="form-error">{error}</p>}
      <div className="field">
        <label htmlFor="signin-email">Email</label>
        <input
          id="signin-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <button className="form-submit" type="submit">
        Send sign-in link →
      </button>
    </form>
  );
}
