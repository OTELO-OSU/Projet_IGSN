// Test-only fetch stub: replies with `body` as JSON at `status`, and records
// the last requested URL so specs can assert the path and query params.
export function stubFetch(
  body: unknown,
  status = 200,
): { fetch: typeof fetch; lastUrl: () => string | undefined } {
  let seen: string | undefined;
  const fetchFn: typeof fetch = async (input) => {
    seen =
      input instanceof URL
        ? input.href
        : typeof input === "string"
          ? input
          : input.url;
    return new Response(JSON.stringify(body), { status });
  };
  return { fetch: fetchFn, lastUrl: () => seen };
}
