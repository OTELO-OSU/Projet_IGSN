import { describe, expect, it } from "vitest";

import { allowedAvailabilityStatuses } from "./allowed-availability-statuses.ts";
import { AVAILABILITY_STATUSES } from "./availability-status.ts";

describe("allowedAvailabilityStatuses", () => {
  it.each([
    { existenceStatus: null, expected: AVAILABILITY_STATUSES },
    { existenceStatus: "exists" as const, expected: AVAILABILITY_STATUSES },
    {
      existenceStatus: "partially_consumed" as const,
      expected: AVAILABILITY_STATUSES,
    },
    { existenceStatus: "consumed" as const, expected: ["not_available"] },
    { existenceStatus: "destroyed" as const, expected: ["not_available"] },
    { existenceStatus: "lost" as const, expected: ["not_available"] },
    { existenceStatus: "unknown" as const, expected: ["unknown"] },
  ])(
    "should allow $expected for the existence status $existenceStatus",
    ({ existenceStatus, expected }) => {
      expect(allowedAvailabilityStatuses(existenceStatus)).toEqual(expected);
    },
  );
});
