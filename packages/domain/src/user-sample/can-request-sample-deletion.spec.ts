import type { SampleStatus } from "../sample/sample.ts";
import type { UserSampleRole } from "./model.ts";

import { canRequestSampleDeletion } from "./can-request-sample-deletion.ts";

describe("canRequestSampleDeletion", () => {
  it.each([
    ["owner", "published", false, true],
    ["owner", "withdrawn", false, true],
    ["owner", "draft", false, false],
    ["editor", "published", false, false],
    ["contributor", "published", false, false],
    [null, "published", false, false],
    ["owner", "published", true, false],
  ] as [UserSampleRole | null, SampleStatus, boolean, boolean][])(
    "should answer, for the %s on a %s sample with superAdmin %s, %s",
    (role, status, superAdmin, expected) => {
      expect(canRequestSampleDeletion(role, { status }, { superAdmin })).toBe(
        expected,
      );
    },
  );
});
