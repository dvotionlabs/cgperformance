"use client";

import { useEffect, useState, useCallback } from "react";

interface Slot {
  scheduledAt: string;
  available: boolean;
}

interface Booking {
  id: string;
  scheduled_at: string;
  duration_minutes: number;
  status: string;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function BookingWidget() {
  const [date, setDate] = useState(todayISO());
  const [slots, setSlots] = useState<Slot[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadBookings = useCallback(async () => {
    const res = await fetch("/api/bookings");
    const data = await res.json();
    if (res.ok) setBookings(data.bookings ?? []);
  }, []);

  const loadSlots = useCallback(async (forDate: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/slots?date=${forDate}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load slots");
      setSlots(data.slots ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load slots");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  useEffect(() => {
    loadSlots(date);
  }, [date, loadSlots]);

  async function book(scheduledAt: string) {
    setError(null);
    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scheduledAt }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Could not book that slot");
      return;
    }
    await Promise.all([loadSlots(date), loadBookings()]);
  }

  async function cancel(id: string) {
    setError(null);
    const res = await fetch(`/api/bookings/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Could not cancel that booking");
      return;
    }
    await Promise.all([loadSlots(date), loadBookings()]);
  }

  const upcoming = bookings.filter(
    (b) => b.status === "booked" && new Date(b.scheduled_at) > new Date()
  );

  return (
    <div>
      {error && <p className="form-error">{error}</p>}

      <h3 style={{ marginTop: 0 }}>Your upcoming sessions</h3>
      {upcoming.length === 0 ? (
        <p className="measure">No sessions booked yet.</p>
      ) : (
        <table className="data" style={{ marginBottom: 40 }}>
          <thead>
            <tr>
              <th>Date</th>
              <th>Time</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {upcoming.map((b) => {
              const d = new Date(b.scheduled_at);
              return (
                <tr key={b.id}>
                  <td>{d.toLocaleDateString("en-GB")}</td>
                  <td>{d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</td>
                  <td>
                    <button className="txt-link muted" onClick={() => cancel(b.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                      Cancel
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <h3>Book a session</h3>
      <div className="field" style={{ maxWidth: 220 }}>
        <label htmlFor="booking-date">Date</label>
        <input
          id="booking-date"
          type="date"
          min={todayISO()}
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      {loading ? (
        <p className="measure">Loading availability…</p>
      ) : (
        <div className="plan-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))" }}>
          {slots.map((slot) => {
            const time = new Date(slot.scheduledAt).toLocaleTimeString("en-GB", {
              hour: "2-digit",
              minute: "2-digit",
            });
            return (
              <button
                key={slot.scheduledAt}
                type="button"
                className="plan-option"
                disabled={!slot.available}
                onClick={() => book(slot.scheduledAt)}
                style={!slot.available ? { opacity: 0.35, cursor: "not-allowed" } : undefined}
              >
                {time}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
