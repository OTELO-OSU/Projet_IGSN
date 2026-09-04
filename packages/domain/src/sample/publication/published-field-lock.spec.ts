import { describe, expect, it } from "vitest";

import {
  type CreateSample,
  createSampleSchema,
  type Sample,
} from "../sample.ts";
import { type SyntheticDetails } from "../synthetic-details/model.ts";
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
      vertical: { position: 10, reference: "elevation", system: "ngf_ign69" },
    },
    region: { kind: "continent", country: "FR" },
    navigationType: "GPS",
    localityName: "stored locality",
    localityDescription: "stored locality detail",
  },
  description: {
    collectionDate: {
      precision: "day",
      start: "2000-01-01",
      end: "2000-01-02",
    },
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
  repository: { currentArchive: "02feahw73" },
  geologicalContextDescription: "stored geological context",
  geomorphologicalEnvironment: "marine_zone.fjord",
  scientificContext: {
    provenanceStatus: "field_sample",
    funderOrganizations: ["https://ror.org/00stored"],
    researchProgramName: "Stored program",
    chiefScientist: "Stored chief",
    chiefScientistOrcid: "0000-0002-1825-0097",
    hostInstitution: ["https://ror.org/00struct"],
    collectorName: "Stored collector",
    collectorOrcid: "0000-0002-1825-0097",
    researchCampaign: "stored campaign",
    funding: "stored funding",
    researchProgramDescription: "stored program desc",
    fieldName: "stored field",
    missionDescription: "stored mission",
  },
  syntheticDetails: null,
  age: null,
  relations: [],
  attachments: [],
  security: null,
  existenceStatus: "exists",
  availabilityStatus: "available",
  publicationYear: 2020,
  resourceType: "mineral_and_ore",
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
  status: "published",
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
        vertical: {
          position: 99,
          reference: "elevation",
          system: "ngf_ign69",
        },
      },
      region: { kind: "ocean", oceanSea: null },
      navigationType: "LBL",
      localityName: "edited locality",
      localityDescription: "edited locality detail",
    },
    description: {
      collectionDate: {
        precision: "day",
        start: "1990-05-05",
        end: "1990-05-06",
      },
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
    repository: { currentArchive: "04kdfz702" },
    geologicalContextDescription: "edited geological context",
    geomorphologicalEnvironment: "wetland.peat_bog",
    scientificContext: {
      provenanceStatus: "field_sample",
      funderOrganizations: ["https://ror.org/00edited"],
      researchProgramName: "Edited program",
      chiefScientist: "Edited chief",
      chiefScientistOrcid: "0000-0001-5109-3700",
      hostInstitution: ["https://ror.org/00editedstruct"],
      collectorName: "Edited collector",
      collectorOrcid: "0000-0001-5109-3700",
      researchCampaign: "edited campaign",
      funding: "edited funding",
      researchProgramDescription: "edited program desc",
      fieldName: "edited field",
      missionDescription: "edited mission",
    },
    age: null,
    relations: [],
    attachments: [],
    security: null,
    existenceStatus: "lost",
    availabilityStatus: "not_available",
    resourceType: "hydrocarbon",
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
      incoming({ existenceStatus: "lost" }),
    );
    expect(merged.existenceStatus).toBe("lost");
    expect(merged.collectionMethod).toBe("dredging");
    expect(merged.specificName).toBe("edited specific");
    expect(merged.resourceType).toBe("hydrocarbon");
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

  it.each([
    "synthetic_rock_mineral",
    "extraterrestrial_rock.returned_samples.lunar_sample",
  ])(
    "keeps a %s sample without a location, which its material forbids",
    (material) => {
      const refused: Sample = { ...stored, material, location: null };
      const merged = mergePublishedEdit(
        refused,
        incoming({
          material,
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
    },
  );

  it("keeps the location a published sample stored before its material forbade one", () => {
    const material = "extraterrestrial_rock.returned_samples.lunar_sample";
    const merged = mergePublishedEdit(
      { ...stored, material },
      incoming({ material, location: null }),
    );
    expect(merged.location).toEqual(stored.location);
  });

  it("keeps frozen location coords/type/region but takes editable locality and vertical position", () => {
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
    expect(merged.location?.position?.vertical).toEqual({
      position: 99,
      reference: "elevation",
      system: "ngf_ign69",
    });
  });

  it("keeps the frozen endpoints of a published line but takes its vertical values", () => {
    const storedLine: Sample = {
      ...stored,
      location: {
        position: {
          type: "line",
          startLongitude: 1,
          startLatitude: 2,
          endLongitude: 3,
          endLatitude: 4,
          vertical: {
            start: 10,
            end: 20,
            reference: "core_depth",
            system: "local",
          },
        },
      },
    };
    const merged = mergePublishedEdit(
      storedLine,
      incoming({
        location: {
          position: {
            type: "line",
            startLongitude: 50,
            startLatitude: 51,
            endLongitude: 52,
            endLatitude: 53,
            vertical: {
              start: 99,
              end: 98,
              reference: "core_depth",
              system: "local",
            },
          },
        },
      }),
    );
    expect(merged.location?.position).toEqual({
      type: "line",
      startLongitude: 1,
      startLatitude: 2,
      endLongitude: 3,
      endLatitude: 4,
      vertical: {
        start: 99,
        end: 98,
        reference: "core_depth",
        system: "local",
      },
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
      precision: "day",
      start: "2000-01-01",
      end: "2000-01-02",
    });
    expect(merged.description?.oriented).toBe(false);
    expect(merged.description?.openDescription).toBe("edited open");
  });

  it("keeps frozen scientific-context leaves but takes editable ones on the same branch", () => {
    const merged = mergePublishedEdit(stored, incoming());
    expect(merged.scientificContext).toMatchObject({
      provenanceStatus: "field_sample",
      funderOrganizations: ["https://ror.org/00stored"],
      researchProgramName: "Stored program",
      chiefScientist: "Stored chief",
      chiefScientistOrcid: "0000-0001-5109-3700",
      hostInstitution: ["https://ror.org/00struct"],
      collectorName: "Stored collector",
      collectorOrcid: "0000-0002-1825-0097",
      researchCampaign: "edited campaign",
      funding: "edited funding",
    });
  });

  it("does not flip the scientific-context branch nor smuggle mismatched-branch leaves", () => {
    const merged = mergePublishedEdit(
      stored,
      incoming({
        scientificContext: {
          provenanceStatus: "collection_specimen",
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

  it("carries relations and attachments from the payload", () => {
    const relations = [
      {
        relationType: "references" as const,
        identifierType: "doi" as const,
        identifier: "https://doi.org/10.1234/x",
        targetTitle: "Referenced paper",
      },
    ];
    const merged = mergePublishedEdit(stored, incoming({ relations }));
    expect(merged.relations).toEqual(relations);
  });

  describe("syntheticDetails", () => {
    const storedDetails: SyntheticDetails = {
      startingMaterial: "natural",
      startingMaterialNature: "rock",
      startingMaterialComposition: "stored composition",
      finalProduct: "glass",
      experimentType: "fusion",
      experimentDuration: { value: 2, unit: "hour" },
      experimentDurationNotRelevant: false,
      synthesisDate: { start: "2000-01-01", end: "2000-01-02" },
      operatorName: "Stored operator",
      operatorOrcid: "0000-0002-1825-0097",
      researchStructure: ["04kdfz702"],
      temperature: { value: 900, unit: "celsius" },
      pressure: { value: 1, unit: "gpa" },
      experimentalProtocol: "stored protocol",
      experimentPurpose: "stored purpose",
      equipmentUsed: "stored equipment",
    };
    const incomingDetails: SyntheticDetails = {
      startingMaterial: "mixture",
      startingMaterialNature: "powder",
      startingMaterialComposition: "edited composition",
      finalProduct: "fluid",
      experimentType: "diffusion",
      experimentDuration: { value: 30, unit: "minute" },
      experimentDurationNotRelevant: true,
      synthesisDate: { start: "1990-05-05", end: "1990-05-06" },
      operatorName: "Edited operator",
      operatorOrcid: "0000-0001-5109-3700",
      researchStructure: ["02feahw73"],
      temperature: { value: 1200, unit: "kelvin" },
      pressure: { value: 3, unit: "kbar" },
      experimentalProtocol: "edited protocol",
      experimentPurpose: "edited purpose",
      equipmentUsed: "edited equipment",
    };
    const synthetic: Sample = {
      ...stored,
      material: "synthetic_rock_mineral",
      location: null,
      syntheticDetails: storedDetails,
    };

    it("keeps the frozen synthesis leaves but takes the editable conditions", () => {
      const merged = mergePublishedEdit(
        synthetic,
        incoming({
          material: synthetic.material,
          location: null,
          syntheticDetails: incomingDetails,
        }),
      );

      expect(merged.syntheticDetails).toEqual({
        ...storedDetails,
        temperature: incomingDetails.temperature,
        pressure: incomingDetails.pressure,
        experimentalProtocol: "edited protocol",
        experimentPurpose: "edited purpose",
        equipmentUsed: "edited equipment",
      });
    });

    it("takes the whole section when the sample was published without one", () => {
      const merged = mergePublishedEdit(
        { ...synthetic, syntheticDetails: null },
        incoming({
          material: synthetic.material,
          location: null,
          syntheticDetails: incomingDetails,
        }),
      );

      expect(merged.syntheticDetails).toEqual(incomingDetails);
    });
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
