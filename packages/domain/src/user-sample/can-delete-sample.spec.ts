import type { SampleStatus, SynchronizationStatus } from "../sample/sample.ts";
import type { UserSampleRole } from "./model.ts";

import { canDeleteSample } from "./can-delete-sample.ts";

describe("canDeleteSample", () => {
  it.each([
    ["owner", "draft", null, true],
    ["editor", "draft", null, true],
  ] as [
    UserSampleRole | null,
    SampleStatus,
    SynchronizationStatus | null,
    boolean,
  ][])(
    "should let the %s delete a %s sample synchronized %s",
    (role, status, synchronizationStatus) => {
      expect(canDeleteSample(role, { status, synchronizationStatus })).toBe(
        true,
      );
    },
  );

  it.each([
    ["contributor", "draft", null],
    [null, "draft", null],
    ["owner", "published", "synced"],
    ["editor", "published", "synced"],
    ["contributor", "published", "synced"],
    [null, "published", "synced"],
    ["owner", "withdrawn", "synced"],
    ["editor", "withdrawn", "synced"],
    ["owner", "draft", "pending"],
    ["editor", "draft", "pending"],
    ["owner", "draft", "failed"],
    ["editor", "draft", "failed"],
    ["contributor", "draft", "failed"],
    [null, "draft", "failed"],
  ] as [UserSampleRole | null, SampleStatus, SynchronizationStatus | null][])(
    "should refuse the %s deleting a %s sample synchronized %s",
    (role, status, synchronizationStatus) => {
      expect(canDeleteSample(role, { status, synchronizationStatus })).toBe(
        false,
      );
    },
  );
});
