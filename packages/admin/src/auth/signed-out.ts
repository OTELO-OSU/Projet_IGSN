const SIGNED_OUT_KEY = "igsn-signed-out";

export function markSignedOut(): void {
  sessionStorage.setItem(SIGNED_OUT_KEY, "1");
}

export function readSignedOut(): boolean {
  return sessionStorage.getItem(SIGNED_OUT_KEY) !== null;
}

export function clearSignedOut(): void {
  sessionStorage.removeItem(SIGNED_OUT_KEY);
}
