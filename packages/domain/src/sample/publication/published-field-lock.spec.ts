import { describe, expect, it } from "vitest";

import {
  type CreateSample,
  createSampleSchema,
  type Sample,
} from "../sample.ts";
import {
  frozenMaterialDepth,
  mergePublishedEdit,
} from "./published-field-lock.ts";

const stored: Sample = {
  id: "11111111-1111-1111-1111-111111111111",
  name: "Stored name",
  nature: "hand_sample",
  type: "core",
  material: "rock.igneous.plutonic",
  texture: null,
  metamorphicFacies: null,
  collectionMethod: "manual",
  collectionMethodDescription: "stored method detail",
  specificName: "stored specific",
  location: {
    position: {
      type: "point",
      longitude: 1,
      latitude: 2,
      elevation: { min: 10, max: 10, unit: "m", datum: "msl" },
    },
    region: { kind: "continent", country: "FR" },
    navigationType: "GPS",
    localityName: "stored locality",
    localityDescription: "stored locality detail",
  },
  description: {
    collectionDate: { start: "2000-01-01", end: "2000-01-02" },
    oriented: true,
    orientationExplanation: "stored orientation",
    openDescription: "stored open",
    length: null,
    width: null,
    thickness: null,
    mass: null,
    volume: null,
  },
  condition: null,
  scientificContext: {
    provenanceStatus: "recent_collection",
    funderOrganization: "https://ror.org/00stored",
    researchProgramName: "Stored program",
    researchProgramChief: "Stored chief",
    researchProgramChiefOrcid: "0000-0002-1825-0097",
    researchStructure: ["https://ror.org/00struct"],
    collectorName: "Stored collector",
    collectorOrcid: "0000-0002-1825-0097",
    researchCampaign: "stored campaign",
    funding: "stored funding",
    researchProgramDescription: "stored program desc",
    fieldName: "stored field",
    missionDescription: "stored mission",
  },
  age: null,
  links: [],
  attachments: [],
  security: null,
  availability: "exists",
  publicationYear: 2020,
  economicInterest: "no",
  economicInterestElements: [],
  economicResourceTypePrecision: null,
  economicDepositName: null,
  economicDepositDescription: null,
  igsn: "ABC123",
  owner: null,
  manualGroups: [
    { id: "22222222-2222-2222-2222-222222222222", name: "Stored group" },
  ],
  institutionalOrganization: null,
  institutionalOsu: null,
  institutionalLaboratory: null,
  published: true,
  createdAt: new Date("2020-01-01"),
  updatedAt: new Date("2020-01-01"),
};

function incoming(overrides: Partial<CreateSample> = {}): CreateSample {
  return {
    name: "Edited name",
    nature: "rock_powder",
    type: "dredge",
    material: "sediment",
    texture: null,
    metamorphicFacies: null,
    collectionMethod: "dredging",
    collectionMethodDescription: "edited method detail",
    specificName: "edited specific",
    location: {
      position: {
        type: "point",
        longitude: 50,
        latitude: 60,
        elevation: { min: 99, max: 99, unit: "m", datum: "msl" },
      },
      region: { kind: "ocean", oceanSea: null },
      navigationType: "LBL",
      localityName: "edited locality",
      localityDescription: "edited locality detail",
    },
    description: {
      collectionDate: { start: "1990-05-05", end: "1990-05-06" },
      oriented: false,
      orientationExplanation: null,
      openDescription: "edited open",
      length: null,
      width: null,
      thickness: null,
      mass: null,
      volume: null,
    },
    condition: null,
    scientificContext: {
      provenanceStatus: "recent_collection",
      funderOrganization: "https://ror.org/00edited",
      researchProgramName: "Edited program",
      researchProgramChief: "Edited chief",
      researchProgramChiefOrcid: "0000-0001-5109-3700",
      researchStructure: ["https://ror.org/00editedstruct"],
      collectorName: "Edited collector",
      collectorOrcid: "0000-0001-5109-3700",
      researchCampaign: "edited campaign",
      funding: "edited funding",
      researchProgramDescription: "edited program desc",
      fieldName: "edited field",
      missionDescription: "edited mission",
    },
    age: null,
    links: [],
    attachments: [],
    security: null,
    availability: "no_longer_exists",
    economicInterest: "yes",
    economicInterestElements: [],
    economicResourceTypePrecision: null,
    economicDepositName: null,
    economicDepositDescription: null,
    ...overrides,
  };
}

describe("mergePublishedEdit", () => {
  it("returns every createSampleSchema key", () => {
    const merged = mergePublishedEdit(stored, incoming());

    expect(Object.keys(merged).sort()).toEqual(
      Object.keys(createSampleSchema.shape).sort(),
    );
  });

  it("takes whole-editable fields from the payload", () => {
    const merged = mergePublishedEdit(
      stored,
      incoming({ availability: "no_longer_exists" }),
    );
    expect(merged.availability).toBe("no_longer_exists");
    expect(merged.collectionMethod).toBe("dredging");
    expect(merged.specificName).toBe("edited specific");
    expect(merged.economicInterest).toBe("yes");
  });

  it("keeps whole-frozen fields from storage, ignoring the payload", () => {
    const merged = mergePublishedEdit(stored, incoming());
    expect(merged.name).toBe("Stored name");
    expect(merged.nature).toBe("hand_sample");
    expect(merged.type).toBe("core");
  });

  it("takes the texture and facies from a payload agreeing on the material", () => {
    const withTexture: Sample = { ...stored, texture: "phaneritic" };
    const merged = mergePublishedEdit(
      withTexture,
      incoming({ material: withTexture.material, texture: "cumulate" }),
    );
    expect(merged.texture).toBe("cumulate");
    expect(merged.metamorphicFacies).toBeNull();
  });

  it("keeps the stored texture and facies when the payload's material disagrees", () => {
    const metamorphic: Sample = {
      ...stored,
      material: "rock.metamorphic",
      metamorphicFacies: "eclogite",
    };
    const merged = mergePublishedEdit(
      metamorphic,
      incoming({
        material: "rock.igneous.plutonic",
        texture: "cumulate",
        metamorphicFacies: null,
      }),
    );
    expect(merged.metamorphicFacies).toBe("eclogite");
    expect(merged.texture).toBeNull();
  });

  it("keeps a synthetic sample without a location, which its material forbids", () => {
    const synthetic: Sample = {
      ...stored,
      material: "synthetic_rock_mineral",
      location: null,
    };
    const merged = mergePublishedEdit(
      synthetic,
      incoming({
        location: {
          position: null,
          region: null,
          navigationType: null,
          localityName: "smuggled locality",
          localityDescription: null,
        },
      }),
    );
    expect(merged.location).toBeNull();
  });

  it("keeps frozen location coords/type/region but takes editable locality and elevation", () => {
    const merged = mergePublishedEdit(stored, incoming());
    expect(merged.location?.position).toMatchObject({
      type: "point",
      longitude: 1,
      latitude: 2,
    });
    expect(merged.location?.region).toEqual({
      kind: "continent",
      country: "FR",
    });
    expect(merged.location?.localityName).toBe("edited locality");
    expect(merged.location?.localityDescription).toBe("edited locality detail");
    expect(merged.location?.navigationType).toBe("LBL");
    expect(merged.location?.position?.elevation).toEqual({
      min: 99,
      max: 99,
      unit: "m",
      datum: "msl",
    });
  });

  it("adds an editable locality when the sample was published without a location", () => {
    const withoutLocation: Sample = { ...stored, location: null };
    const merged = mergePublishedEdit(
      withoutLocation,
      incoming({
        location: {
          position: null,
          region: null,
          navigationType: null,
          localityName: "added locality",
          localityDescription: null,
        },
      }),
    );
    expect(merged.location).toEqual({
      position: null,
      region: null,
      navigationType: null,
      localityName: "added locality",
      localityDescription: null,
    });
  });

  it("stays without a location when none was stored and none is given", () => {
    const withoutLocation: Sample = { ...stored, location: null };
    const merged = mergePublishedEdit(
      withoutLocation,
      incoming({ location: null }),
    );
    expect(merged.location).toBeNull();
  });

  it("keeps frozen collectionDate but takes editable description leaves", () => {
    const merged = mergePublishedEdit(stored, incoming());
    expect(merged.description?.collectionDate).toEqual({
      start: "2000-01-01",
      end: "2000-01-02",
    });
    expect(merged.description?.oriented).toBe(false);
    expect(merged.description?.openDescription).toBe("edited open");
  });

  it("keeps frozen scientific-context leaves but takes editable ones on the same branch", () => {
    const merged = mergePublishedEdit(stored, incoming());
    expect(merged.scientificContext).toMatchObject({
      provenanceStatus: "recent_collection",
      funderOrganization: "https://ror.org/00stored",
      researchProgramName: "Stored program",
      researchProgramChief: "Stored chief",
      collectorName: "Stored collector",
      collectorOrcid: "0000-0001-5109-3700",
      researchCampaign: "edited campaign",
      funding: "edited funding",
    });
  });

  it("does not flip the scientific-context branch nor smuggle mismatched-branch leaves", () => {
    const merged = mergePublishedEdit(
      stored,
      incoming({
        scientificContext: {
          provenanceStatus: "historical_specimen",
          collectionCurator: "Smuggled curator",
          collectionOrigin: "purchase",
          collectorName: "Smuggled collector",
          collectionContextDescription: "smuggled context",
        },
      }),
    );
    expect(merged.scientificContext).toEqual(stored.scientificContext);
  });

  it("keeps the stored manual groups, ignoring the payload's ids", () => {
    const merged = mergePublishedEdit(
      stored,
      incoming({
        manualGroupIds: ["33333333-3333-3333-3333-333333333333"],
      }),
    );
    expect(merged.manualGroupIds).toEqual([
      "22222222-2222-2222-2222-222222222222",
    ]);
  });

  it("carries links and attachments from the payload", () => {
    const merged = mergePublishedEdit(
      stored,
      incoming({ links: [{ url: "https://doi.org/10.1234/x" }] }),
    );
    expect(merged.links).toEqual([{ url: "https://doi.org/10.1234/x" }]);
  });

  describe("material", () => {
    it.each([
      [
        "rock.igneous.plutonic.felsic.granite",
        "rock.igneous.plutonic.felsic.granodiorite",
      ],
      [
        "sediment.exogenous_detritic",
        "sediment.exogenous_detritic.sand.medium_sand",
      ],
    ])("refines %s into %s", (current, next) => {
      const merged = mergePublishedEdit(
        { ...stored, material: current },
        incoming({ material: next }),
      );
      expect(merged).toMatchObject({ material: next });
    });

    it.each([
      [
        "rock.igneous.plutonic.felsic.granite",
        "rock.igneous.volcanic.felsic.rhyolite",
      ],
      [
        "rock.igneous.plutonic.felsic.granite",
        "rock.metamorphic.strongly_metamorphosed.gneiss",
      ],
      ["rock.igneous.plutonic", "rock.igneous.plutonic.felsic.granite"],
      ["rock.igneous.plutonic.felsic.granite", null],
    ])("keeps %s when the payload carries %s", (current, next) => {
      const merged = mergePublishedEdit(
        { ...stored, material: current },
        incoming({ material: next }),
      );
      expect(merged).toMatchObject({ material: current });
    });

    it.each([
      {
        current: {
          material: "rock.metamorphic.strongly_metamorphosed.gneiss",
          metamorphicFacies: "granulite",
          texture: "cataclastic",
        },
        next: {
          material: "rock.metamorphic.strongly_metamorphosed.schist",
          metamorphicFacies: "granulite",
          texture: "cataclastic",
        },
      },
      {
        current: {
          material: "rock.igneous.plutonic.felsic.granite",
          texture: "phaneritic",
        },
        next: {
          material: "rock.igneous.plutonic.felsic.granodiorite",
          texture: "cumulate",
        },
      },
    ] as const)(
      "takes the texture and facies sent alongside a material refined to $next.material",
      ({ current, next }) => {
        const merged = mergePublishedEdit(
          { ...stored, ...current },
          incoming(next),
        );
        expect(merged).toMatchObject(next);
      },
    );

    it("keeps the stored texture when a rejected refinement leaves the material behind", () => {
      const merged = mergePublishedEdit(
        {
          ...stored,
          material: "rock.igneous.plutonic.felsic.granite",
          texture: "phaneritic",
        },
        incoming({
          material: "rock.igneous.volcanic.felsic.rhyolite",
          texture: "glassy",
        }),
      );
      expect(merged).toMatchObject({
        material: "rock.igneous.plutonic.felsic.granite",
        texture: "phaneritic",
      });
    });
  });
});

describe("frozenMaterialDepth", () => {
  it.each([
    ["rock.igneous.plutonic.felsic.granite", 4],
    ["rock.igneous.plutonic", Infinity],
    [null, Infinity],
  ])("locks the levels of %s above depth %s", (material, depth) => {
    expect(frozenMaterialDepth(material)).toBe(depth);
  });
});
