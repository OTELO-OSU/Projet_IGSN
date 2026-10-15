import { osuIdOf } from "./osu-id-of.ts";
import { type Osu } from "./osu.ts";

const catalog: Osu[] = [
  {
    id: "201420664E",
    code: "OSUNA",
    formerCodes: ["OSU-NA"],
    name: "Observatoire des Sciences de l'Univers Nantes Atlantique",
    organizationRors: ["02feahw73"],
  },
];

describe("osuIdOf", () => {
  it.each([
    { input: "a current code", code: "OSUNA", expected: "201420664E" },
    { input: "a former code", code: "OSU-NA", expected: "201420664E" },
    { input: "an unknown value", code: "OSU-X", expected: "OSU-X" },
  ])("should resolve $input to its id", ({ code, expected }) => {
    expect(osuIdOf(code, catalog)).toBe(expected);
  });
});
