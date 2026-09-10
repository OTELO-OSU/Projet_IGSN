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
  metamorphicFabric: null,
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
  parents: [],
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
    metamorphicFabric: null,
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
    parentIds: [],
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
    const relations = [
      {
        relationType: "references" as const,
        identifierType: "doi" as const,
        identifier: "https://doi.org/10.1234/x",
        targetTitle: "Referenced paper",
      },
    ];
    const payload = incoming({ existenceStatus: "lost", relations });
    const merged = mergePublishedEdit(stored, payload);
    expect(merged.existenceStatus).toBe("lost");
    expect(merged.collectionMethod).toBe("dredging");
    expect(merged.specificName).toBe("edited specific");
    expect(merged.resourceType).toBe("hydrocarbon");
    expect(merged.name).toBe("Edited name");
    expect(merged.nature).toBe("rock_powder");
    expect(merged.type).toBe("dredge");
    expect(merged.description).toEqual(payload.description);
    expect(merged.relations).toEqual(relations);
  });

  it("takes the texture, facies and fabric from a payload agreeing on the material", () => {
    const withTexture: Sample = { ...stored, texture: "phaneritic" };
    const merged = mergePublishedEdit(
      withTexture,
      incoming({ material: withTexture.material, texture: "cumulate" }),
    );
    expect(merged.texture).toBe("cumulate");
    expect(merged.metamorphicFacies).toBeNull();
    expect(merged.metamorphicFabric).toBeNull();
  });

  it("keeps every material-governed field when the payload's material is refused", () => {
    const metamorphic: Sample = {
      ...stored,
      material: "rock.metamorphic",
      texture: "cataclastic",
      metamorphicFacies: "eclogite",
      metamorphicFabric: "gneissic",
    };
    const merged = mergePublishedEdit(metamorphic, incoming());
    expect(merged).toMatchObject({
      material: "rock.metamorphic",
      texture: "cataclastic",
      metamorphicFacies: "eclogite",
      metamorphicFabric: "gneissic",
      location: stored.location,
      geologicalContextDescription: "stored geological context",
      geomorphologicalEnvironment: "marine_zone.fjord",
    });
  });

  it("takes the location from the payload", () => {
    const payload = incoming({ material: stored.material });
    const merged = mergePublishedEdit(stored, payload);
    expect(merged.location).toEqual(payload.location);
  });

  it("keeps the frozen collector name but takes the other field-sample leaves", () => {
    const payload = incoming();
    const merged = mergePublishedEdit(stored, payload);
    expect(merged.scientificContext).toEqual({
      ...payload.scientificContext,
      collectorName: "Stored collector",
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

  describe("syntheticDetails", () => {
    const storedDetails: SyntheticDetails = {
      startingMaterial: "natural",
      startingMaterialNature: "rock",
      startingMaterialComposition: "stored composition",
      finalProduct: "glass",
      experimentType: "fusion",
      experimentDuration: { value: 2, unit: "hour" },
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

    it("keeps the frozen operator name but takes every other synthesis leaf", () => {
      const merged = mergePublishedEdit(
        synthetic,
        incoming({
          material: synthetic.material,
          location: null,
          syntheticDetails: incomingDetails,
        }),
      );

      expect(merged.syntheticDetails).toEqual({
        ...incomingDetails,
        operatorName: "Stored operator",
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
        "rock.igneous.plutonic.felsic.granite",
        "rock.metamorphic.strongly_metamorphosed.gneiss",
      ],
      ["rock.igneous.plutonic.felsic.granite", "rock.igneous"],
    ])("moves %s to %s, both under the published root", (current, next) => {
      const merged = mergePublishedEdit(
        { ...stored, material: current },
        incoming({ material: next }),
      );
      expect(merged).toMatchObject({ material: next });
    });

    it.each([
      [
        "rock.igneous.plutonic.felsic.granite",
        "sediment.exogenous_detritic.clay",
      ],
      ["mineral", "fossil"],
      ["rock.igneous.plutonic.felsic.granite", null],
    ])("keeps %s when the payload carries %s", (current, next) => {
      const merged = mergePublishedEdit(
        { ...stored, material: current },
        incoming({ material: next }),
      );
      expect(merged).toMatchObject({ material: current });
    });

    it("takes the texture sent alongside a material refined under the root", () => {
      const next = {
        material: "rock.igneous.plutonic.felsic.granodiorite",
        texture: "cumulate",
      } as const;
      const merged = mergePublishedEdit(
        {
          ...stored,
          material: "rock.igneous.plutonic.felsic.granite",
          texture: "phaneritic",
        },
        incoming(next),
      );
      expect(merged).toMatchObject(next);
    });

    it("drops the stored location when the material moves to one that forbids it", () => {
      const merged = mergePublishedEdit(
        {
          ...stored,
          material: "extraterrestrial_rock.meteorites.chondrites",
        },
        incoming({
          material: "extraterrestrial_rock.returned_samples.lunar_sample",
          location: null,
        }),
      );
      expect(merged).toMatchObject({
        material: "extraterrestrial_rock.returned_samples.lunar_sample",
        location: null,
      });
    });

    it("keeps the stored location when the payload's material is rejected", () => {
      const merged = mergePublishedEdit(
        { ...stored, material: "synthetic_rock_mineral", location: null },
        incoming({ material: "rock.igneous" }),
      );
      expect(merged).toMatchObject({
        material: "synthetic_rock_mineral",
        location: null,
      });
    });
  });
});

describe("frozenMaterialDepth", () => {
  it.each([
    ["rock.igneous.plutonic.felsic.granite", 1],
    ["mineral", Infinity],
    [null, Infinity],
  ])("locks the levels of %s above depth %s", (material, depth) => {
    expect(frozenMaterialDepth(material)).toBe(depth);
  });
});
