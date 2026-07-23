export const SESSION_DURATION_MINUTES = 30;

// Monday 00:00:00 through the following Monday 00:00:00, in UTC. Good enough
// for a single-venue, single-timezone (Europe/London) v1 — revisit if venues
// span timezones.
export function currentWeekBounds(reference = new Date()): { start: Date; end: Date } {
  const day = reference.getUTCDay(); // 0 = Sunday
  const diffToMonday = day === 0 ? -6 : 1 - day;

  const start = new Date(
    Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth(), reference.getUTCDate())
  );
  start.setUTCDate(start.getUTCDate() + diffToMonday);

  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 7);

  return { start, end };
}

export function generateDaySlots(
  dateISO: string,
  opensAt: string,
  closesAt: string
): string[] {
  const [openH, openM] = opensAt.split(":").map(Number);
  const [closeH, closeM] = closesAt.split(":").map(Number);

  const slots: string[] = [];
  const cursor = new Date(`${dateISO}T00:00:00.000Z`);
  cursor.setUTCHours(openH, openM, 0, 0);

  const closeTime = new Date(`${dateISO}T00:00:00.000Z`);
  closeTime.setUTCHours(closeH, closeM, 0, 0);

  while (cursor.getTime() + SESSION_DURATION_MINUTES * 60_000 <= closeTime.getTime()) {
    slots.push(cursor.toISOString());
    cursor.setUTCMinutes(cursor.getUTCMinutes() + SESSION_DURATION_MINUTES);
  }

  return slots;
}
