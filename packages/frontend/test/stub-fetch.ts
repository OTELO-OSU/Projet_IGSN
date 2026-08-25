export function stubFetch(
  body: unknown,
  status = 200,
): {
  fetch: typeof fetch;
  lastUrl: () => string | undefined;
  lastInit: () => RequestInit | undefined;
} {
  let seen: string | undefined;
  let seenInit: RequestInit | undefined;
  const fetchFn: typeof fetch = async (input, init) => {
    seen =
      input instanceof URL
        ? input.href
        : typeof input === "string"
          ? input
          : input.url;
    seenInit = init;
    return new Response(JSON.stringify(body), { status });
  };
  return { fetch: fetchFn, lastUrl: () => seen, lastInit: () => seenInit };
}
