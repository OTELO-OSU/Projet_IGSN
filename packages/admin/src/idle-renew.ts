import type { UserManager } from "oidc-client-ts";

type RenewControls = Pick<UserManager, "startSilentRenew" | "stopSilentRenew">;

const HOUR_MS = 3_600_000;

// GT-SSO REQ-TOKEN-01 note: an idle open tab must stop renewing its tokens
// after 1h. Interaction re-arms the cutoff and resumes renewal. The env
// override exists so tests and demos can shrink the hour.
export function watchIdleRenew(
  userManager: RenewControls,
  cutoffMs: number = Number(import.meta.env.VITE_RENEW_IDLE_CUTOFF_MS) ||
    HOUR_MS,
): () => void {
  let isIdle = false;

  const goIdle = () => {
    isIdle = true;
    userManager.stopSilentRenew();
  };

  let timer = window.setTimeout(goIdle, cutoffMs);

  const onActivity = () => {
    if (document.visibilityState === "hidden") return;
    window.clearTimeout(timer);
    if (isIdle) {
      isIdle = false;
      userManager.startSilentRenew();
    }
    timer = window.setTimeout(goIdle, cutoffMs);
  };

  const events = ["pointerdown", "keydown", "visibilitychange"] as const;
  for (const event of events) {
    window.addEventListener(event, onActivity, { passive: true });
  }

  return () => {
    window.clearTimeout(timer);
    for (const event of events) {
      window.removeEventListener(event, onActivity);
    }
  };
}
