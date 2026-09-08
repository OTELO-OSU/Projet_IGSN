export type SessionClaims = { sid?: string; sub?: string };

const REVOCATION_TTL_MS = 10 * 60_000;

// ponytail: in-memory, one api instance; move to Postgres or Redis when the api scales out
const revokedKeys = new Map<string, number>();

const revocationKey = (claims: SessionClaims): string | undefined =>
  claims.sid
    ? `sid:${claims.sid}`
    : claims.sub
      ? `sub:${claims.sub}`
      : undefined;

function sweepExpired(): void {
  const now = Date.now();
  for (const [key, expiresAt] of revokedKeys) {
    if (expiresAt <= now) revokedKeys.delete(key);
  }
}

export function revokeSession(claims: SessionClaims): void {
  sweepExpired();
  const key = revocationKey(claims);
  if (key) revokedKeys.set(key, Date.now() + REVOCATION_TTL_MS);
}

export function isSessionRevoked(claims: SessionClaims): boolean {
  sweepExpired();
  return (
    (claims.sid !== undefined && revokedKeys.has(`sid:${claims.sid}`)) ||
    (claims.sub !== undefined && revokedKeys.has(`sub:${claims.sub}`))
  );
}
