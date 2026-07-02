// Renders a Date as yyyy-mm-dd (UTC, deterministic regardless of viewer locale).
export function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
