import { osuCodeOf } from "./osu-code-of.ts";

describe("osuCodeOf", () => {
  it.each([
    { input: "an OSU id", id: "201420664E", expected: "OSUNA" },
    { input: "an unknown value", id: "OSU-X", expected: "OSU-X" },
  ])("should resolve $input to its current code", ({ id, expected }) => {
    expect(osuCodeOf(id)).toBe(expected);
  });
});
