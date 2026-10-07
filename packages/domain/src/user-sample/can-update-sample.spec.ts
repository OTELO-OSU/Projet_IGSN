import type { SampleStatus } from "../sample/sample.ts";
import type { UserSampleRole } from "./model.ts";

import { canUpdateSample } from "./can-update-sample.ts";

describe("canUpdateSample", () => {
  it.each([
    ["owner", "draft", true],
    ["owner", "withdrawn", true],
    ["owner", "embargo", true],
    ["contributor", "embargo", false],
    ["owner", "tombstone", false],
    ["editor", "published", true],
    ["contributor", "draft", true],
    ["contributor", "published", false],
    [null, "draft", false],
    ["editor", "publishing", false],
    ["contributor", "publishing", false],
    ["owner", "publish_failed", true],
    ["contributor", "publish_failed", true],
    [null, "publish_failed", false],
  ] as [UserSampleRole | null, SampleStatus, boolean][])(
    "should answer, for the %s on a %s sample, %s",
    (role, status, expected) => {
      expect(canUpdateSample(role, { status })).toBe(expected);
    },
  );
});
