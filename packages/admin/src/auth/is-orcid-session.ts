export const isOrcidSession = (identityProvider: unknown): boolean =>
  typeof identityProvider === "string" &&
  identityProvider.toLowerCase() ===
    (
      import.meta.env.VITE_OIDC_ORCID_IDENTITY_PROVIDER || "orcid"
    ).toLowerCase();
