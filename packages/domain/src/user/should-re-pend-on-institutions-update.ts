// Clearing a moderated trio voids what the moderator judged, so the account returns to pending (ADR 0023).
export function shouldRePendOnInstitutionsUpdate(
  stored: { institutionalOrganization: string | null; superAdmin: boolean },
  nextInstitutionalOrganization: string | null,
): boolean {
  return (
    nextInstitutionalOrganization === null &&
    stored.institutionalOrganization !== null &&
    !stored.superAdmin
  );
}
