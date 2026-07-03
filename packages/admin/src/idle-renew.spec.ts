import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { watchIdleRenew } from "./idle-renew.ts";

const userManager = {
  startSilentRenew: vi.fn(),
  stopSilentRenew: vi.fn(),
};

let cleanup: (() => void) | undefined;

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup?.();
  cleanup = undefined;
  vi.useRealTimers();
});

describe("watchIdleRenew", () => {
  it("should stop silent renew after the idle cutoff", () => {
    cleanup = watchIdleRenew(userManager, 1000);

    vi.advanceTimersByTime(1000);

    expect(userManager.stopSilentRenew).toHaveBeenCalledTimes(1);
  });

  it("should keep renewing while the user stays active", () => {
    cleanup = watchIdleRenew(userManager, 1000);

    vi.advanceTimersByTime(900);
    window.dispatchEvent(new Event("pointerdown"));
    vi.advanceTimersByTime(900);

    expect(userManager.stopSilentRenew).not.toHaveBeenCalled();
  });

  it("should resume renewal on activity after going idle, then re-arm", () => {
    cleanup = watchIdleRenew(userManager, 1000);

    vi.advanceTimersByTime(1000);
    window.dispatchEvent(new Event("keydown"));

    expect(userManager.startSilentRenew).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(1000);

    expect(userManager.stopSilentRenew).toHaveBeenCalledTimes(2);
  });

  it("should not treat going hidden as activity", () => {
    cleanup = watchIdleRenew(userManager, 1000);

    vi.advanceTimersByTime(1000);
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
    window.dispatchEvent(new Event("visibilitychange"));

    expect(userManager.startSilentRenew).not.toHaveBeenCalled();
  });
});
