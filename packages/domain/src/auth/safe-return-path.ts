function stripBase(path: string, base: string): string {
  return `${path}/`.startsWith(base) ? `/${path.slice(base.length)}` : path;
}

export function safeReturnPath(
  urlState: string | undefined,
  base: string = "/",
): string {
  const path = urlState === undefined ? "" : stripBase(urlState, base);
  return path.startsWith("/") &&
    !path.startsWith("//") &&
    !path.startsWith("/auth/callback")
    ? path
    : "/";
}
