import { generateIgsnSuffix } from "@projet-igsn/domain/igsn/generate-igsn-suffix";
import { faciesFor } from "@projet-igsn/domain/sample/metamorphic-facies/vocabulary";
import { samplePublishBlockers } from "@projet-igsn/domain/sample/publication/sample-publish-blockers";
import { texturesFor } from "@projet-igsn/domain/sample/texture/vocabulary";
import { describe, expect, it } from "vitest";

import { DEMO_SAMPLES } from "./seed-demo-samples.ts";
import { parseSeedSample } from "./seed.ts";

const PUBLISHED = DEMO_SAMPLES.filter((s) => s.published);
const DRAFTS = DEMO_SAMPLES.filter((s) => !s.published);

describe("DEMO_SAMPLES", () => {
  it("should hold exactly 100 rows split 70 published / 30 draft", () => {
    expect(DEMO_SAMPLES).toHaveLength(100);
    expect(PUBLISHED).toHaveLength(70);
    expect(DRAFTS).toHaveLength(30);
  });

  it("should give every row a unique id", () => {
    const ids = new Set(DEMO_SAMPLES.map((s) => s.id));
    expect(ids.size).toBe(DEMO_SAMPLES.length);
  });

  // parseSeedSample runs each row through its schema (create for a draft,
  // published for a published row); a bad row throws and fails the suite.
  it.each(DEMO_SAMPLES.map((s) => [s.name, s] as const))(
    "should accept row %s",
    (_, sample) => {
      expect(() => parseSeedSample(sample)).not.toThrow();
    },
  );

  it("should derive each published igsn from its id and clear it on drafts", () => {
    for (const sample of PUBLISHED) {
      expect(sample.igsn).toBe(generateIgsnSuffix(sample.id));
      expect(
        samplePublishBlockers({
          type: sample.type ?? null,
          material: sample.material ?? null,
          metamorphicFacies: sample.metamorphicFacies ?? null,
          location: sample.location ?? null,
          description: sample.description ?? null,
          age: null,
          availability: sample.availability ?? null,
          scientificContext: sample.scientificContext ?? null,
        }),
      ).toEqual([]);
    }
    for (const sample of DRAFTS) {
      expect(sample.igsn ?? null).toBeNull();
    }
  });
});

describe("DEMO_SAMPLES coverage", () => {
  const materials = DEMO_SAMPLES.map((s) => s.material).filter(
    (m): m is string => m != null,
  );
  const isUnder = (prefix: string) =>
    materials.some((m) => m === prefix || m.startsWith(`${prefix}.`));

  it.each([
    "rock.igneous.plutonic",
    "rock.igneous.volcanic",
    "rock.metamorphic",
    "rock.sedimentary",
    "rock.hydrothermal",
    "sediment",
    "mineral",
    "fossil",
    "synthetic_rock_mineral",
    "extraterrestrial_rock.meteorites",
    "extraterrestrial_rock.returned_samples",
  ])("should include a sample under %s", (prefix) => {
    expect(isUnder(prefix)).toBe(true);
  });

  it("should include at least three metamorphic samples, each with a facies", () => {
    const metamorphic = PUBLISHED.filter(
      (s) => s.material != null && faciesFor(s.material).length > 0,
    );
    expect(metamorphic.length).toBeGreaterThanOrEqual(3);
    for (const sample of metamorphic) {
      expect(sample.metamorphicFacies).not.toBeNull();
    }
  });

  it("should include at least two igneous samples carrying a texture", () => {
    const textured = PUBLISHED.filter(
      (s) =>
        s.texture != null &&
        s.material != null &&
        texturesFor(s.material).length > 0,
    );
    expect(textured.length).toBeGreaterThanOrEqual(2);
  });

  it("should include both point and area positions", () => {
    const kinds = new Set(
      DEMO_SAMPLES.map((s) => s.location?.position?.type).filter(Boolean),
    );
    expect(kinds).toEqual(new Set(["point", "area"]));
  });

  it.each([
    "core.",
    "dredge",
    "individual_sample",
    "serie_of_sample",
    "inapplicable",
  ])("should include the type branch %s", (branch) => {
    const types = DEMO_SAMPLES.map((s) => s.type).filter(
      (t): t is string => t != null,
    );
    expect(types.some((t) => t === branch || t.startsWith(branch))).toBe(true);
  });

  it.each([
    "coring.",
    "dredging.",
    "grab.",
    "blasting",
    "manual",
    "probe",
    "spatial_mission",
    "unknown",
  ])("should include the collection method branch %s", (branch) => {
    const methods = DEMO_SAMPLES.map((s) => s.collectionMethod).filter(
      (m): m is string => m != null,
    );
    expect(methods.some((m) => m === branch || m.startsWith(branch))).toBe(
      true,
    );
  });
});
