import type { SampleStatus } from "../sample/sample.ts";
import type { UserSampleRole } from "./model.ts";

import { canDeleteSample } from "./can-delete-sample.ts";

describe("canDeleteSample", () => {
  it.each([
    ["owner", "draft", true],
    ["editor", "draft", true],
    ["contributor", "draft", false],
    [null, "draft", false],
    ["owner", "published", false],
    ["editor", "published", false],
    ["contributor", "published", false],
    [null, "published", false],
    ["owner", "withdrawn", false],
    ["editor", "withdrawn", false],
  ] as [UserSampleRole | null, SampleStatus, boolean][])(
    "should answer, for the %s on a %s sample, %s",
    (role, status, expected) => {
      expect(canDeleteSample(role, { status })).toBe(expected);
    },
  );
});
