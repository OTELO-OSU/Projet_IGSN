export const SIGN_OUT_BROADCAST_KEY = "igsn-sign-out";

export function broadcastSignOut(storage: Pick<Storage, "setItem">): void {
  storage.setItem(SIGN_OUT_BROADCAST_KEY, crypto.randomUUID());
}

export function isSignOutBroadcast(event: { key: string | null }): boolean {
  return event.key === SIGN_OUT_BROADCAST_KEY;
}
