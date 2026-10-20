export function safeReturnPath(
  urlState: string | undefined,
  base: string = "/",
): string {
  if (urlState === undefined || !`${urlState}/`.startsWith(base)) return "/";
  const path = `/${urlState.slice(base.length)}`;
  // oxlint-disable-next-line no-control-regex
  return /^\/(?!\/)[^\x00-\x20\\]*$/.test(path) &&
    !path.startsWith("/auth/callback")
    ? path
    : "/";
}
