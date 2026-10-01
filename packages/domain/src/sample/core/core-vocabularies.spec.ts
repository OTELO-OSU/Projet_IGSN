import { describe, expect, it } from "vitest";
import { z } from "zod";

import catalog from "../../../messages/en.json";
import { createSampleLabels, type Messages } from "../create-sample-labels.ts";
import { toConcept } from "./concept.ts";
import { coreSampleSchema } from "./core-sample-schema.ts";
import { type CoreVocabulary, coreVocabularies } from "./core-vocabularies.ts";

const m = Object.fromEntries(
  Object.entries(catalog as Record<string, string>)
    .filter(([key]) => !key.startsWith("$"))
    .map(([key, text]) => [key, () => text]),
) as unknown as Messages;

const vocabularies = coreVocabularies(createSampleLabels(m), "en");

const unwrap = (schema: z.core.$ZodType): z.ZodType => {
  if (schema instanceof z.ZodOptional) return unwrap(schema.unwrap());
  if (schema instanceof z.ZodArray) return unwrap(schema.element);
  return schema as z.ZodType;
};

const at = (schema: z.ZodType, ...keys: string[]): z.ZodType =>
  keys.reduce<z.ZodType>(
    (parent, key) => unwrap((parent as z.ZodObject).shape[key]),
    unwrap(schema),
  );

const context = at(coreSampleSchema, "classification", "contextCategories");
const condition = at(coreSampleSchema, "curation", "sampleCondition");
const production = at(coreSampleSchema, "production");
const location = at(production, "location");
const vertical = at(location, "verticalExtent", "minimum");
const relation = at(coreSampleSchema, "relations");
const geology = at(coreSampleSchema, "extensions", "geology");
const mineralogy = at(geology, "mineralogy");
const experiment = at(coreSampleSchema, "extensions", "experiment");
const physical = at(coreSampleSchema, "physicalDescription");

const CORE_FIELD: Record<string, z.ZodType> = {
  material: context,
  "sample-type": at(coreSampleSchema, "classification", "sampleObjectTypes"),
  "nature-of-sample": at(coreSampleSchema, "classification", "natureOfSample"),
  texture: context,
  "metamorphic-facies": context,
  "metamorphic-fabric": context,
  "physiographic-environment": context,
  "resource-type": context,
  element: at(geology, "economic", "interestElements"),
  "strunz-mindat": mineralogy,
  "humidity-type": at(condition, "humidityType"),
  "pressure-type": at(condition, "pressureType"),
  light: at(condition, "lightCondition"),
  packaging: at(condition, "packaging"),
  "ocean-sea": at(location, "oceanOrSea"),
  "navigation-type": at(location, "navigationMethod"),
  "experiment-type": at(experiment, "experimentType"),
  "platform-type": at(
    coreSampleSchema,
    "extensions",
    "fieldwork",
    "platformType",
  ),
  sample_condition: z.union([
    at(condition, "storageCondition"),
    at(condition, "temperature_type"),
  ]),
  sample_description: at(production, "collectionMethod"),
  "provenance-status": context,
  "collection-origin": context,
  existenceStatus: at(coreSampleSchema, "curation", "existenceStatus"),
  availabilityStatus: at(coreSampleSchema, "curation", "availabilityStatus"),
  relationType: at(relation, "relationType"),
  identifierType: at(relation, "targetIdentifier", "identifierType"),
  targetResourceType: at(relation, "targetResourceType"),
  roles: at(coreSampleSchema, "responsibility", "roles"),
  titleType: at(coreSampleSchema, "identification", "titles", "titleType"),
  stepType: at(production, "processSteps", "stepType"),
  collectionDatePrecision: at(production, "collectionDatePrecision"),
  countryCodes: at(location, "countryCodes"),
  chronostratigraphy: at(geology, "chronostratigraphy", "min"),
  verticalReference: at(vertical, "reference"),
  verticalDatum: at(vertical, "verticalDatum"),
  positiveDirection: at(vertical, "positiveDirection"),
  numericAgeUnit: at(geology, "numericAge", "unit"),
  numericAgeEra: at(geology, "numericAge", "era"),
  startingMaterial: at(experiment, "startingMaterial"),
  startingMaterialNature: at(experiment, "startingMaterialNature"),
  finalProduct: at(experiment, "finalProduct"),
  mineralAbundance: at(mineralogy, "abundance"),
  mindatId: at(mineralogy, "mindatId"),
  temperatureUnit: at(condition, "temperature", "unitLabel"),
  pressureUnit: at(condition, "pressure", "unitLabel"),
  massUnit: at(physical, "mass", "unitLabel"),
  sizeUnit: at(physical, "dimensions", "length", "unitLabel"),
  volumeUnit: at(physical, "volume", "unitLabel"),
  experimentDurationUnit: at(experiment, "duration", "unitLabel"),
};

const SCIENTIFIC_CONTEXT = "otelo:scientificContext";

const coreValue = (
  { id, schemeName }: CoreVocabulary,
  value: string | number,
): unknown =>
  schemeName == null
    ? value
    : toConcept(
        schemeName.slice("otelo:".length),
        String(value),
        schemeName === SCIENTIFIC_CONTEXT ? id : undefined,
      );

const STRUCTURAL_ENUMS = ["record.lifecycleEvents.eventType"];

type JsonEnum = { path: string; values: unknown[] };

const enumsOf = (node: unknown, path = ""): JsonEnum[] => {
  if (node == null || typeof node !== "object") return [];
  if (Array.isArray(node)) return node.flatMap((child) => enumsOf(child, path));
  const { enum: values, properties, ...rest } = node as Record<string, unknown>;
  return [
    ...(Array.isArray(values) ? [{ path, values }] : []),
    ...Object.entries(properties ?? {}).flatMap(([key, child]) =>
      enumsOf(child, path === "" ? key : `${path}.${key}`),
    ),
    ...Object.values(rest).flatMap((child) => enumsOf(child, path)),
  ];
};

describe("coreVocabularies", () => {
  it("should ship one vocabulary per Core field, each id once", () => {
    expect(vocabularies.map(({ id }) => id).toSorted()).toEqual(
      Object.keys(CORE_FIELD).toSorted(),
    );
  });

  it.each(vocabularies.map((vocabulary) => [vocabulary.id, vocabulary]))(
    "should spell every %s value id the way its Core field accepts it",
    (id, vocabulary) => {
      const schema = CORE_FIELD[id] ?? z.never();
      const refused = vocabulary.values.filter(
        (value) => !schema.safeParse(coreValue(vocabulary, value.id)).success,
      );
      expect(refused).toEqual([]);
    },
  );

  it("should cover every enum a Core record carries", () => {
    const uncovered = enumsOf(z.toJSONSchema(coreSampleSchema))
      .filter(({ path }) => !STRUCTURAL_ENUMS.includes(path))
      .filter(
        ({ values }) =>
          !vocabularies.some((vocabulary) =>
            values.every((code) =>
              vocabulary.values.some((value) => value.id === code),
            ),
          ),
      )
      .map(({ path }) => path);
    expect(uncovered).toEqual([]);
  });

  it("should label every value with a translation or its code, never a message key", () => {
    const untranslated = vocabularies.flatMap(({ id, values }) =>
      values
        .filter(({ label }) => /^[a-z][a-z0-9]*(_[a-z0-9]+)+$/.test(label))
        .map(({ label }) => `${id}: ${label}`),
    );
    expect(untranslated).toEqual([]);
  });
});
