// A collection date cannot be in the future. Date-only rule, timezone proof:
// "today" is the latest calendar day anywhere on Earth (UTC+14), so the
// verdict depends only on the instant, never on the machine's timezone. The
// browser and the API server agree, and a user entering their local today is
// never rejected wherever they are. The cost: a date can pass up to 14 hours
// early; the rule catches typos (wrong year), not hour-level precision.
// Shared by descriptionSchema and the admin live validators.
const MAX_UTC_OFFSET_MS = 14 * 3_600_000; // UTC+14, the earliest timezone

export function isFutureDate(isoDate: string): boolean {
  const lastTodayOnEarth = new Date(Date.now() + MAX_UTC_OFFSET_MS)
    .toISOString()
    .slice(0, 10);
  return isoDate > lastTodayOnEarth;
}
