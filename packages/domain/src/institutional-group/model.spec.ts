import { describe, expect, it } from "vitest";

import { institutionalGroupRefSchema } from "./model.ts";

describe("institutionalGroupRefSchema", () => {
  it.each([
    ["organization", { kind: "organization", code: "05hnb7x64" }],
    ["osu", { kind: "osu", code: "OSUNA" }],
    ["laboratory", { kind: "laboratory", code: "UMR7327" }],
  ])("should accept a known %s code", (_case, ref) => {
    expect(institutionalGroupRefSchema.parse(ref)).toEqual(ref);
  });

  it.each([
    [
      "an unknown organization ROR",
      { kind: "organization", code: "0zzzzzz99" },
    ],
    ["an unknown OSU code", { kind: "osu", code: "NOT-AN-OSU" }],
    [
      "an unknown laboratory code",
      { kind: "laboratory", code: "NOT-A-LABORATORY" },
    ],
    ["a laboratory code under the OSU kind", { kind: "osu", code: "UMR7327" }],
  ])("should reject %s", (_case, ref) => {
    expect(institutionalGroupRefSchema.safeParse(ref).success).toBe(false);
  });
});
