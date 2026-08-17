import type { AsyncLocalStorage } from "node:async_hooks";

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
