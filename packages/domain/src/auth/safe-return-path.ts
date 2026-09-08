export function isUnderBase(path: string, base: string): boolean {
  return `${path}/`.startsWith(base);
}

function stripBase(path: string, base: string): string {
  return isUnderBase(path, base) ? `/${path.slice(base.length)}` : path;
}

export function safeReturnPath(
  urlState: string | undefined,
  base: string = "/",
): string {
  const path = urlState === undefined ? "" : stripBase(urlState, base);
  return /^\/(?![/\\])/.test(path) && !path.startsWith("/auth/callback")
    ? path
    : "/";
}
