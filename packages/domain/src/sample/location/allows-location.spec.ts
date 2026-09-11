import { describe, expect, it } from "vitest";

import { allowsLocation } from "./allows-location.ts";

describe("allowsLocation", () => {
  it.each([
    "rock_and_sediment.synthetic_rock_mineral",
    "rock_and_sediment.extraterrestrial_rock.returned_samples",
    "rock_and_sediment.extraterrestrial_rock.returned_samples.lunar_sample",
    "rock_and_sediment.extraterrestrial_rock.returned_samples.other",
  ])("should refuse a location on %s", (material) => {
    expect(allowsLocation(material)).toBe(false);
  });

  it.each([
    null,
    "rock_and_sediment.extraterrestrial_rock",
    "rock_and_sediment.extraterrestrial_rock.meteorites",
    "rock_and_sediment.rock.igneous.volcanic.basalt",
    "rock_and_sediment.mineral",
  ])("should allow a location on %s", (material) => {
    expect(allowsLocation(material)).toBe(true);
  });
});
