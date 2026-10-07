import type { Cron } from "croner";

import { afterEach, describe, expect, it, vi } from "vitest";

import { scheduleEmbargoRelease } from "./embargo-release-schedule.ts";

let job: Cron | undefined;

const schedule = (run: () => void = () => {}) => {
  job = scheduleEmbargoRelease(run);
  return job;
};

afterEach(() => {
  job?.stop();
  job = undefined;
});

describe("scheduleEmbargoRelease", () => {
  it.each([
    { from: "2026-07-01T12:00:00Z", next: "2026-07-02T04:00:00.000Z" },
    { from: "2026-01-15T03:00:00Z", next: "2026-01-15T05:00:00.000Z" },
  ])(
    "should next run at 6:00 in Paris, $next after $from",
    ({ from, next }) => {
      expect(schedule().nextRun(new Date(from))?.toISOString()).toBe(next);
    },
  );

  it("should run when the schedule fires", async () => {
    const run = vi.fn();

    await schedule(run).trigger();

    expect(run).toHaveBeenCalledTimes(1);
  });
});
