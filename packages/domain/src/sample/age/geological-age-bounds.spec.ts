import { GEOLOGICAL_AGES } from "./geological-age";
import {
  GEOLOGICAL_AGE_BOUNDARIES_MA,
  geologicalAgeBoundsMa,
} from "./geological-age-bounds";

describe("GEOLOGICAL_AGE_BOUNDARIES_MA", () => {
  it("should have one more boundary than there are ranks", () => {
    expect(GEOLOGICAL_AGE_BOUNDARIES_MA).toHaveLength(
      GEOLOGICAL_AGES.length + 1,
    );
  });

  it("should be strictly ascending", () => {
    GEOLOGICAL_AGE_BOUNDARIES_MA.reduce((prev, boundary) => {
      expect(boundary).toBeGreaterThan(prev);
      return boundary;
    });
  });

  it("should start at the present and end at the age of Earth", () => {
    expect(GEOLOGICAL_AGE_BOUNDARIES_MA[0]).toBe(0);
    expect(GEOLOGICAL_AGE_BOUNDARIES_MA.at(-1)).toBe(4567);
  });
});

describe("geologicalAgeBoundsMa", () => {
  it.each(GEOLOGICAL_AGES)(
    "should return an ascending [young, old] interval for rank %s",
    (rank) => {
      const [young, old] = geologicalAgeBoundsMa(rank);
      expect(young).toBeLessThan(old);
    },
  );

  it("should return the Miocene (rank 4) interval", () => {
    expect(geologicalAgeBoundsMa(4)).toEqual([5.333, 23.03]);
  });

  it("should return the Cretaceous Upper (rank 8) interval", () => {
    expect(geologicalAgeBoundsMa(8)).toEqual([66.0, 100.5]);
  });
});
