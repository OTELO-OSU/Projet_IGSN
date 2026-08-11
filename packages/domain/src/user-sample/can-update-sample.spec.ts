import type { UserSampleRole } from "./model.ts";

import { canUpdateSample } from "./can-update-sample.ts";

describe("canUpdateSample", () => {
  it.each([
    ["owner", false, true],
    ["owner", true, true],
    ["editor", false, true],
    ["editor", true, true],
    ["contributor", false, true],
    ["contributor", true, false],
    [null, false, false],
    [null, true, false],
  ] as [UserSampleRole | null, boolean, boolean][])(
    "should answer, for the %s on a sample published=%s, %s",
    (role, published, expected) => {
      expect(canUpdateSample(role, { published })).toBe(expected);
    },
  );
});
