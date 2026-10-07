import type { SampleStatus } from "../sample.ts";

import { hasPermanentIgsn } from "./has-permanent-igsn.ts";

describe("hasPermanentIgsn", () => {
  it.each([
    ["draft", false],
    ["publishing", false],
    ["publish_failed", false],
    ["published", true],
    ["withdrawn", true],
    ["embargo", true],
    ["tombstone", true],
  ] as [SampleStatus, boolean][])(
    "should answer %s with %s",
    (status, expected) => {
      expect(hasPermanentIgsn({ status })).toBe(expected);
    },
  );
});
