import type { SetSampleStatusBody } from "../sample/sample-validator.ts";
import type { SampleStatus } from "../sample/sample.ts";
import type { UserSampleRole } from "./model.ts";

import { canSetSampleStatus } from "./can-set-sample-status.ts";

describe("canSetSampleStatus", () => {
  it.each([
    ["owner", false, "published", "withdrawn", true],
    ["contributor", false, "published", "withdrawn", false],
    ["owner", false, "published", "tombstone", false],
    ["editor", true, "withdrawn", "tombstone", true],
    ["editor", true, "tombstone", "published", true],
    ["owner", false, "tombstone", "withdrawn", false],
    ["owner", true, "draft", "withdrawn", false],
  ] as [
    UserSampleRole | null,
    boolean,
    SampleStatus,
    SetSampleStatusBody["status"],
    boolean,
  ][])(
    "should answer, for the %s (managed: %s) moving a %s sample to %s, %s",
    (role, managed, status, to, expected) => {
      expect(canSetSampleStatus(role, managed, { status }, to)).toBe(expected);
    },
  );
});
