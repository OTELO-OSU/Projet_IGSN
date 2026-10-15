import { institutionFilterSchema } from "./institution-filter.ts";

describe("institutionFilterSchema", () => {
  it.each([
    ["organization", "organization:03am2jy38"],
    ["osu of the submitted organisme", "osu:03am2jy38/OMP"],
    ["laboratory", "laboratory:UMR5110"],
    ["laboratory under a former code", "laboratory:UPS2074"],
  ])("should accept a %s of the catalog", (_kind, value) => {
    expect(institutionFilterSchema.safeParse(value).success).toBe(true);
  });

  it.each([
    ["an unknown kind", "region:OMP"],
    ["a missing colon", "OMP"],
    ["an organization absent from the catalog", "organization:00000000z"],
    ["an osu with no organisme", "osu:OMP"],
    ["an osu holding no laboratory of the organisme", "osu:03am2jy38/OASU"],
    ["an osu RNSR id", "osu:03am2jy38/200719584L"],
    ["a laboratory RNSR id", "laboratory:201320566C"],
  ])("should reject %s", (_reason, value) => {
    expect(institutionFilterSchema.safeParse(value).success).toBe(false);
  });
});
