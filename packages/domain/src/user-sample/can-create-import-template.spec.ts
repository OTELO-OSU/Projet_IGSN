import type { SampleStatus } from "../sample/sample.ts";

import { canCreateImportTemplate } from "./can-create-import-template.ts";

describe("canCreateImportTemplate", () => {
  it.each([
    ["published", "rock_and_sediment.rock"],
    ["withdrawn", "rock_and_sediment.sediment"],
    ["embargo", "rock_and_sediment.sediment"],
  ] as [SampleStatus, string][])(
    "should allow a %s sample of %s",
    (status, material) => {
      expect(canCreateImportTemplate({ status, material })).toBe(true);
    },
  );

  it.each([
    ["draft", "rock_and_sediment.rock"],
    ["tombstone", "rock_and_sediment.rock"],
    ["published", null],
    ["published", "rock_and_sediment.mineral"],
    ["published", "rock_and_sediment.synthetic_rock_mineral"],
  ] as [SampleStatus, string | null][])(
    "should refuse a %s sample of %s",
    (status, material) => {
      expect(canCreateImportTemplate({ status, material })).toBe(false);
    },
  );
});
