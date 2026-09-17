import type { SampleStatus } from "../sample/sample.ts";

import { canDuplicateSample } from "./can-duplicate-sample.ts";

describe("canDuplicateSample", () => {
  it.each([
    ["draft", true],
    ["published", true],
    ["withdrawn", true],
    ["tombstone", false],
  ] as [SampleStatus, boolean][])(
    "should answer %s with %s",
    (status, expected) => {
      expect(canDuplicateSample({ status })).toBe(expected);
    },
  );
});
