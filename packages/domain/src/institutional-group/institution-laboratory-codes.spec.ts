import { institutionLaboratoryCodes } from "./institution-laboratory-codes.ts";

const OMP_ORGANIZATION = "03am2jy38";

describe("institutionLaboratoryCodes", () => {
  it("should resolve an organization to every laboratory of that organisme", () => {
    expect(
      institutionLaboratoryCodes(`organization:${OMP_ORGANIZATION}`),
    ).toEqual(["UMR5110", "USR3278"]);
  });

  it.each([
    ["osu:02en5vm52/OSU-Externe", ["FR636", "UMR7159"]],
    ["osu:05f82e368/OSU-Externe", ["FR636"]],
  ])(
    "should resolve %s to its laboratories of that organisme alone",
    (filter, expected) => {
      expect(institutionLaboratoryCodes(filter)).toEqual(expected);
    },
  );

  it("should resolve a laboratory to that code alone", () => {
    expect(institutionLaboratoryCodes("laboratory:FR636")).toEqual(["FR636"]);
  });

  it("should resolve an invalid filter to no laboratory", () => {
    expect(institutionLaboratoryCodes("laboratory:UMR9999")).toEqual([]);
  });
});
