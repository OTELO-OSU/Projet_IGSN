import { describe, expect, it } from "vitest";

import { locationRequirement } from "./location-requirement.ts";

describe("locationRequirement", () => {
  it.each(["synthetic_rock_mineral"])(
    "should forbid a location for synthetic material %s",
    (material) => {
      expect(locationRequirement(material)).toBe("forbidden");
    },
  );

  it.each([
    "extraterrestrial_rock.returned_samples",
    "extraterrestrial_rock.returned_samples.lunar_sample",
    "extraterrestrial_rock.returned_samples.asteroid",
  ])("should make a location optional for returned sample %s", (material) => {
    expect(locationRequirement(material)).toBe("optional");
  });

  it("should be undetermined for an unclassified (null) material", () => {
    expect(locationRequirement(null)).toBe("undetermined");
  });

  it("should be undetermined for a bare extraterrestrial_rock (returned samples would make it optional)", () => {
    expect(locationRequirement("extraterrestrial_rock")).toBe("undetermined");
  });

  it.each([
    "rock.igneous.volcanic.basalt",
    "sediment.biogenic",
    "extraterrestrial_rock.meteorites",
    "mineral",
  ])("should require a location for other material %s", (material) => {
    expect(locationRequirement(material)).toBe("required");
  });
});
