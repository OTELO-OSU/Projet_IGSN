export function joinContactName(
  firstname: string | null | undefined,
  lastname: string | null | undefined,
): string {
  return [firstname, lastname].filter(Boolean).join(" ");
}

// ponytail: a single space splits the pair, so a compound first name lands on the
// last name; only the legacy import feeds this, where no split pair exists
export function splitContactName(contact: string | null | undefined): {
  firstname: string | null;
  lastname: string | null;
} {
  if (!contact) return { firstname: null, lastname: null };
  const separator = contact.indexOf(" ");
  if (separator < 0) return { firstname: null, lastname: contact };
  return {
    firstname: contact.slice(0, separator),
    lastname: contact.slice(separator + 1),
  };
}
