export const SIGN_OUT_BROADCAST_KEY = "igsn-sign-out";

export function broadcastSignOut(): void {
  localStorage.setItem(SIGN_OUT_BROADCAST_KEY, crypto.randomUUID());
}

export function onSignOutBroadcast(listener: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === SIGN_OUT_BROADCAST_KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => window.removeEventListener("storage", onStorage);
}
