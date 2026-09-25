export function safeReturnPath(
  urlState: string | undefined,
  base: string = "/",
): string {
  if (urlState === undefined || !`${urlState}/`.startsWith(base)) return "/";
  const path = `/${urlState.slice(base.length)}`;
  return /^\/(?![/\\])/.test(path) && !path.startsWith("/auth/callback")
    ? path
    : "/";
}
