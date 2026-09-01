import { describe, expect, it } from "vitest";

import { allowsLocation } from "./allows-location.ts";

describe("allowsLocation", () => {
  it.each([
    "synthetic_rock_mineral",
    "extraterrestrial_rock.returned_samples",
    "extraterrestrial_rock.returned_samples.lunar_sample",
    "extraterrestrial_rock.returned_samples.other",
  ])("should refuse a location on %s", (material) => {
    expect(allowsLocation(material)).toBe(false);
  });

  it.each([
    null,
    "extraterrestrial_rock",
    "extraterrestrial_rock.meteorites",
    "rock.igneous.volcanic.basalt",
    "mineral",
  ])("should allow a location on %s", (material) => {
    expect(allowsLocation(material)).toBe(true);
  });
});
