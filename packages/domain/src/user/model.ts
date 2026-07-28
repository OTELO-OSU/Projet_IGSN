// A researcher known to the registry. Provisioned from the verified token on
// first authenticated request (no user-management UI yet), so email is the
// identity key and the name parts are optional: the IdP may release neither.
// A plain type, not a Zod schema: the user only ever comes from a verified token
// or our own row, so nothing parses it.
export type User = {
  id: string;
  email: string;
  name: string | null;
  firstname: string | null;
};
