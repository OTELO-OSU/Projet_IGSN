import type { Cron } from "croner";

import { afterEach, describe, expect, it, vi } from "vitest";

import { scheduleDataGouvExport } from "./schedule.ts";

let job: Cron | undefined;

const schedule = (run: () => void = () => {}) => {
  job = scheduleDataGouvExport(run);
  return job;
};

afterEach(() => {
  job?.stop();
  job = undefined;
  delete process.env.DATA_GOUV_CRON;
});

describe("scheduleDataGouvExport", () => {
  it.each([
    { from: "2026-07-15T12:00:00Z", next: "2026-08-01T01:00:00.000Z" },
    { from: "2026-12-31T12:00:00Z", next: "2027-01-01T02:00:00.000Z" },
  ])(
    "should next run on the 1st at 3:00 in Paris, $next after $from",
    ({ from, next }) => {
      expect(schedule().nextRun(new Date(from))?.toISOString()).toBe(next);
    },
  );

  it("should follow DATA_GOUV_CRON when set", () => {
    process.env.DATA_GOUV_CRON = "0 4 * * *";

    expect(
      schedule().nextRun(new Date("2026-07-15T12:00:00Z"))?.toISOString(),
    ).toBe("2026-07-16T02:00:00.000Z");
  });

  it("should run when the schedule fires", async () => {
    const run = vi.fn();

    await schedule(run).trigger();

    expect(run).toHaveBeenCalledTimes(1);
  });
});
