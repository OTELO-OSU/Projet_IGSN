import type { CreateSample } from "@projet-igsn/domain/sample/sample";

import { describe, expect, it } from "vitest";

import {
  type RequiredField,
  sampleRequiredFields,
} from "#/samples/sample-required-fields.ts";

import { EMPTY_RELATION_DRAFT, toSampleDraft } from "./sample-draft-schema.ts";

type Draft = ReturnType<typeof toSampleDraft>;

const ROCK = "rock_and_sediment.rock";

const byName = (a: RequiredField, b: RequiredField) =>
  a.name.localeCompare(b.name);

const requiredUnder = (draft: Draft, prefixes: string[]) =>
  sampleRequiredFields(draft, [])
    .filter(({ name }) => prefixes.some((prefix) => name.startsWith(prefix)))
    .toSorted(byName);

const draftOf = (
  sample: Partial<CreateSample>,
  patch: (draft: Draft) => Partial<Draft> = () => ({}),
): Draft => {
  const draft = toSampleDraft(sample);
  return { ...draft, ...patch(draft) };
};

const fieldSample = (context: Partial<Draft["scientificContext"]>) =>
  draftOf({}, (draft) => ({
    scientificContext: {
      ...draft.scientificContext,
      provenanceStatus: "field_sample",
      ...context,
    },
  }));

const withAge = (age: Partial<Draft["age"]>) =>
  draftOf({}, (draft) => ({ age: { ...draft.age, ...age } }));

describe("sampleRequiredFields", () => {
  it.each<[string, Draft, string[], RequiredField[]]>([
    [
      "a fixed numeric age requires no bound",
      withAge({ numericAgeMin: 5, numericAgeMax: 5 }),
      ["age.numericAgeM"],
      [],
    ],
    [
      "a numeric range with one bound requires both, the filled one met",
      withAge({ numericAgeMin: 10 }),
      ["age.numericAgeM"],
      [
        { name: "age.numericAgeMax", isMet: false },
        { name: "age.numericAgeMin", isMet: true },
      ],
    ],
    [
      "a stratigraphic range with one bound requires both, the filled one met",
      withAge({ geologicalAgeMin: "1" }),
      ["age.geologicalAgeM"],
      [
        { name: "age.geologicalAgeMax", isMet: false },
        { name: "age.geologicalAgeMin", isMet: true },
      ],
    ],
    ["an empty age section requires nothing", draftOf({}), ["age."], []],
    [
      "a linked collector is one met entry",
      fieldSample({ collectorUserId: "3f2504e0-4f89-41d3-9a0c-0305000000a1" }),
      ["scientificContext.collector"],
      [{ name: "scientificContext.collectorUserId", isMet: true }],
    ],
    [
      "an unset collector is one picker entry",
      fieldSample({}),
      ["scientificContext.collector"],
      [{ name: "scientificContext.collectorUserId", isMet: false }],
    ],
    [
      "a typed collector requires a first and a last name",
      fieldSample({ collectorFirstname: "Marie" }),
      ["scientificContext.collector"],
      [
        { name: "scientificContext.collectorFirstname", isMet: true },
        { name: "scientificContext.collectorLastname", isMet: false },
      ],
    ],
    [
      "an untouched chief scientist requires nothing",
      fieldSample({}),
      ["scientificContext.chiefScientist"],
      [],
    ],
    [
      "a chief scientist with one name typed requires the other",
      fieldSample({ chiefScientistLastname: "Curie" }),
      ["scientificContext.chiefScientist"],
      [
        { name: "scientificContext.chiefScientistFirstname", isMet: false },
        { name: "scientificContext.chiefScientistLastname", isMet: true },
      ],
    ],
    [
      "a vertical reference alone requires the vertical position",
      draftOf({ material: ROCK }, (draft) => ({
        location: {
          ...draft.location,
          type: "point",
          verticalReference: "bathymetry",
        },
      })),
      ["location.vertical"],
      [
        { name: "location.verticalPosition", isMet: false },
        { name: "location.verticalReference", isMet: true },
      ],
    ],
    [
      "a measurement value requires its unit",
      draftOf({}, (draft) => ({
        description: { ...draft.description, lengthValue: 3 },
      })),
      ["description.length"],
      [{ name: "description.lengthUnit", isMet: false }],
    ],
    [
      "a synthesis value requires its unit",
      draftOf(
        { material: "rock_and_sediment.synthetic_rock_mineral" },
        (draft) => ({
          syntheticDetails: {
            ...draft.syntheticDetails,
            temperatureValue: 800,
          },
        }),
      ),
      ["syntheticDetails.temperature"],
      [{ name: "syntheticDetails.temperatureUnit", isMet: false }],
    ],
    [
      "a controlled storage reading value requires its unit",
      draftOf({}, (draft) => ({
        condition: {
          ...draft.condition,
          storageConditions: ["temperature_controlled"],
          temperatureType: "frozen",
          temperatureValue: -20,
        },
      })),
      ["condition.temperatureUnit"],
      [{ name: "condition.temperatureUnit", isMet: false }],
    ],
    [
      "a blank name is unmet",
      draftOf({ name: "  " }),
      ["name"],
      [{ name: "name", isMet: false }],
    ],
    [
      "a relation requires its identifier, type and resource type",
      draftOf({}, () => ({
        relations: [
          {
            key: "r1",
            identifierType: "doi",
            ...EMPTY_RELATION_DRAFT,
            identifier: "10.1000/1",
          },
        ],
      })),
      ["relations[0]"],
      [
        { name: "relations[0].identifier", isMet: true },
        { name: "relations[0].relationType", isMet: false },
        { name: "relations[0].targetResourceType", isMet: false },
      ],
    ],
    [
      "a mineral classification row requires its path",
      draftOf({ material: "rock_and_sediment.mineral" }, () => ({
        mineralClassifications: [{ key: "m1", path: [], abundance: undefined }],
      })),
      ["mineralClassifications"],
      [{ name: "mineralClassifications[0].path", isMet: false }],
    ],
    [
      "a date with a time requires its time zone",
      draftOf({}, (draft) => ({
        description: {
          ...draft.description,
          collectionDateStart: "2026-01-01T10:00",
          collectionDateEnd: "2026-01-01T10:00",
          collectionDatePrecision: "hour",
        },
      })),
      ["description.collectionDate"],
      [
        { name: "description.collectionDateStart", isMet: true },
        { name: "description.collectionDateTimeZone", isMet: false },
      ],
    ],
    [
      "a date range requires its end",
      draftOf({}, (draft) => ({
        description: {
          ...draft.description,
          collectionDateStart: "2026-01-01",
          collectionDateEnd: undefined,
        },
      })),
      ["description.collectionDate"],
      [
        { name: "description.collectionDateEnd", isMet: false },
        { name: "description.collectionDateStart", isMet: true },
      ],
    ],
    [
      "a location type requires its coordinates",
      draftOf({ material: ROCK }, (draft) => ({
        location: { ...draft.location, type: "point", longitude: 3 },
      })),
      ["location.l"],
      [
        { name: "location.latitude", isMet: false },
        { name: "location.longitude", isMet: true },
      ],
    ],
    [
      "a process step requires its date",
      draftOf({ parentIds: ["p1"] }, () => ({
        processSteps: [
          {
            key: "s1",
            kind: "subsampling",
            dateStart: undefined,
            dateEnd: undefined,
            datePrecision: "day",
            dateTimeZone: undefined,
            description: "",
          },
        ],
      })),
      ["processSteps"],
      [{ name: "processSteps[0].dateStart", isMet: false }],
    ],
    [
      "a sub-sample requires no collection date and no location",
      draftOf({ material: ROCK, parentIds: ["p1"] }, (draft) => ({
        location: {
          ...draft.location,
          type: "point",
          verticalReference: "bathymetry",
        },
      })),
      ["description.collectionDate", "location."],
      [],
    ],
  ])("%s", (_rule, draft, prefixes, expected) => {
    expect(requiredUnder(draft, prefixes)).toEqual(expected.toSorted(byName));
  });
});
