import type { AsyncLocalStorage } from "node:async_hooks";

// The visitor IP of the SSR request being rendered, so api calls made server-side
// are billed to the visitor and not to the frontend container (see the api rate
// limit). node:async_hooks is imported dynamically and behind import.meta.env.SSR,
// a build-time constant, so it never reaches the browser bundle.
// Memoize the promise, not the store: awaiting between a check and an
// assignment lets two cold requests each build a store and orphan one.
let store: Promise<AsyncLocalStorage<string | undefined>> | undefined;

function getStore() {
  if (!import.meta.env.SSR) return undefined;
  store ??= import("node:async_hooks").then(
    ({ AsyncLocalStorage }) => new AsyncLocalStorage<string | undefined>(),
  );
  return store;
}

export async function runWithClientIp<T>(
  ip: string | undefined,
  render: () => Promise<T>,
): Promise<T> {
  const contexts = await getStore();
  return contexts ? contexts.run(ip, render) : render();
}

export async function getClientIp(): Promise<string | undefined> {
  return (await getStore())?.getStore();
}
