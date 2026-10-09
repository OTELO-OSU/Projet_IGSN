import type { SampleStatus, SynchronizationStatus } from "../sample/sample.ts";
import type { UserSampleRole } from "./model.ts";

import { canUpdateSample } from "./can-update-sample.ts";

describe("canUpdateSample", () => {
  it.each([
    ["owner", "draft", null, true],
    ["owner", "withdrawn", null, true],
    ["owner", "embargo", null, true],
    ["contributor", "embargo", null, false],
    ["owner", "tombstone", null, false],
    ["editor", "published", null, true],
    ["editor", "published", "pending", true],
    ["contributor", "draft", null, true],
    ["contributor", "published", null, false],
    [null, "draft", null, false],
    ["owner", "draft", "failed", true],
    ["contributor", "draft", "failed", true],
    [null, "draft", "failed", false],
  ] as [
    UserSampleRole | null,
    SampleStatus,
    SynchronizationStatus | null,
    boolean,
  ][])(
    "should answer, for the %s on a %s sample synchronized %s, %s",
    (role, status, synchronizationStatus, expected) => {
      expect(canUpdateSample(role, { status, synchronizationStatus })).toBe(
        expected,
      );
    },
  );

  it.each([
    "owner",
    "editor",
    "contributor",
    null,
  ] as (UserSampleRole | null)[])(
    "should refuse the %s a draft queued for publication",
    (role) => {
      expect(
        canUpdateSample(role, {
          status: "draft",
          synchronizationStatus: "pending",
        }),
      ).toBe(false);
    },
  );
});
