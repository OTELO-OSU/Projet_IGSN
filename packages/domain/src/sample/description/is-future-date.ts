// A collection date cannot be in the future. Compared against the local
// calendar day, not UTC: a sample collected "today" just ahead of UTC must not
// be rejected. Shared by descriptionSchema and the admin live validators.
export function isFutureDate(isoDate: string): boolean {
  const now = new Date();
  const today = new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 10);
  return isoDate > today;
}
