import { institutionFilterSchema } from "./institution-filter.ts";

describe("institutionFilterSchema", () => {
  it.each([
    ["organization", "organization:03am2jy38"],
    ["osu of the submitted organisme", "osu:03am2jy38/OMP"],
    ["laboratory", "laboratory:UMR5110"],
  ])("should accept a %s of the catalog", (_kind, value) => {
    expect(institutionFilterSchema.safeParse(value).success).toBe(true);
  });

  it.each([
    ["an unknown kind", "region:OMP"],
    ["a missing colon", "OMP"],
    ["an organization absent from the catalog", "organization:00000000z"],
    ["an osu with no organisme", "osu:OMP"],
    ["an osu absent from the catalog", "osu:03am2jy38/OSU-Inconnu"],
    ["an osu holding no laboratory of the organisme", "osu:03am2jy38/OASU"],
    ["a laboratory absent from the catalog", "laboratory:UMR9999"],
  ])("should reject %s", (_reason, value) => {
    expect(institutionFilterSchema.safeParse(value).success).toBe(false);
  });
});
