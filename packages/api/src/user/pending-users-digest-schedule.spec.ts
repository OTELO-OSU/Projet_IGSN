import type { Cron } from "croner";

import { afterEach, describe, expect, it, vi } from "vitest";

import { schedulePendingUsersDigest } from "./pending-users-digest-schedule.ts";

let job: Cron | undefined;

const schedule = (send: () => void = () => {}) => {
  job = schedulePendingUsersDigest(send);
  return job;
};

afterEach(() => {
  job?.stop();
  job = undefined;
});

describe("schedulePendingUsersDigest", () => {
  it.each([
    { from: "2026-08-06T12:00:00Z", next: "2026-08-10T05:00:00.000Z" },
    { from: "2026-08-10T04:00:00Z", next: "2026-08-10T05:00:00.000Z" },
    { from: "2026-08-10T12:00:00Z", next: "2026-08-17T05:00:00.000Z" },
    { from: "2026-01-15T12:00:00Z", next: "2026-01-19T06:00:00.000Z" },
  ])(
    "should next send at 7:00 in Paris on a Monday, $next after $from",
    ({ from, next }) => {
      expect(schedule().nextRun(new Date(from))?.toISOString()).toBe(next);
    },
  );

  it("should send when the schedule fires", async () => {
    const send = vi.fn();

    await schedule(send).trigger();

    expect(send).toHaveBeenCalledTimes(1);
  });
});
