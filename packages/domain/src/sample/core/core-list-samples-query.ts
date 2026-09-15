import { z } from "zod";

import { filterOrganizationsWithLaboratory } from "../../institutional-group/filter-organizations-with-laboratory.ts";
import {
  LABORATORIES,
  laboratoryCodeSchema,
} from "../../institutional-group/laboratory.ts";
import {
  ORGANIZATIONS,
  organizationRorSchema,
} from "../../institutional-group/organization.ts";
import { OSUS, osuCodeSchema } from "../../institutional-group/osu.ts";
import { NUMERIC_UNITS, numericUnitSchema } from "../age/numeric-unit.ts";
import {
  collectionMethodSchema,
  COLLECTION_METHOD_HIERARCHY,
} from "../collection-method/vocabulary.ts";
import {
  materialPathSchema,
  MATERIAL_HIERARCHY,
} from "../material/classification.ts";
import { NATURES, natureSchema } from "../nature.ts";
import { expandPaths } from "../path/expand-paths.ts";
import { type ListSamplesQuery, bboxSchema } from "../sample-validator.ts";
import { searchTermSchema } from "../search/search-tokens.ts";
import { TEXTURES, textureSchema } from "../texture/vocabulary.ts";
import { sampleTypeSchema, SAMPLE_TYPE_HIERARCHY } from "../type/vocabulary.ts";

export const CORE_FILTER_PARAM = {
  search: "search",
  bbox: "bbox",
  sampleObjectType: "type",
  materialCategory: "material",
  collectionMethod: "collectionMethod",
  natureOfSample: "nature",
  texture: "texture",
  projectName: "researchProgramName",
  chiefScientist: "chiefScientist",
  hostingInstitution: "hostInstitution",
  collector: "collectorName",
  curator: "collectionCurator",
  numericAgeMin: "ageMin",
  numericAgeMax: "ageMax",
  numericAgeUnit: "ageUnit",
  affiliationOrganization: "institutionalOrganization",
  affiliationOsu: "institutionalOsu",
  affiliationLaboratory: "institutionalLaboratory",
  manualGroup: "manualGroup",
  contributor: "contributor",
} as const satisfies Record<string, string>;

const textFilter = (description: string) =>
  z.string().trim().min(1).optional().meta({ description });

export function coreFilterFields() {
  return {
    search: searchTermSchema.meta({
      description:
        "Free-text search over the sample identifier, names and descriptions, truncated past 200 characters.",
    }),
    bbox: bboxSchema.optional().meta({
      type: "string",
      description:
        'Bounding box "west,south,east,north" in decimal degrees, keeping the samples collected inside it.',
    }),
    sampleObjectType: sampleTypeSchema.optional().meta({
      enum: expandPaths(
        SAMPLE_TYPE_HIERARCHY.nodes,
        SAMPLE_TYPE_HIERARCHY.roots,
      ),
      description:
        "Sample object type path, matching that type and every type under it.",
    }),
    materialCategory: materialPathSchema.optional().meta({
      enum: expandPaths(MATERIAL_HIERARCHY.nodes, MATERIAL_HIERARCHY.roots),
      description:
        "Material classification path, matching that material and every material under it.",
    }),
    collectionMethod: collectionMethodSchema.optional().meta({
      enum: expandPaths(
        COLLECTION_METHOD_HIERARCHY.nodes,
        COLLECTION_METHOD_HIERARCHY.roots,
      ),
      description:
        "Collection method path, matching that method and every method under it.",
    }),
    natureOfSample: natureSchema.optional().meta({
      enum: [...NATURES],
      description: "Nature of the sample.",
    }),
    texture: textureSchema.optional().meta({
      enum: [...TEXTURES],
      description: "Texture of the sample.",
    }),
    projectName: textFilter(
      "Name of the research program, matched on a fragment, case and accents ignored.",
    ),
    chiefScientist: textFilter(
      "Name of the chief scientist, matched on a fragment, case and accents ignored.",
    ),
    hostingInstitution: organizationRorSchema.optional().meta({
      enum: ORGANIZATIONS.map((o) => o.ror),
      description: "ROR id of an institution hosting the sample.",
    }),
    collector: textFilter(
      "Name of the collector, matched on a fragment, case and accents ignored.",
    ),
    curator: textFilter(
      "Name of the collection curator, matched on a fragment, case and accents ignored.",
    ),
    numericAgeMin: z.coerce.number().optional().meta({
      type: "number",
      description:
        "Lower bound of the sample numeric age, in the unit given by numericAgeUnit.",
    }),
    numericAgeMax: z.coerce.number().optional().meta({
      type: "number",
      description:
        "Upper bound of the sample numeric age, in the unit given by numericAgeUnit.",
    }),
    numericAgeUnit: numericUnitSchema.optional().meta({
      enum: [...NUMERIC_UNITS],
      description:
        "Unit the numeric age bounds are expressed in, ma when left out.",
    }),
    affiliationOrganization: organizationRorSchema.optional().meta({
      enum: filterOrganizationsWithLaboratory().map((o) => o.ror),
      description:
        "ROR id of the organisme recorded on the sample when it was created.",
    }),
    affiliationOsu: osuCodeSchema.optional().meta({
      enum: OSUS.map((o) => o.code),
      description:
        "Code of the OSU recorded on the sample when it was created.",
    }),
    affiliationLaboratory: laboratoryCodeSchema.optional().meta({
      enum: LABORATORIES.map((l) => l.code),
      description:
        "Code of the laboratory recorded on the sample when it was created.",
    }),
    manualGroup: z.uuid().optional().meta({
      description: "Identifier of a manual group the sample belongs to.",
    }),
    contributor: z.uuid().optional().meta({
      description: "Identifier of a user contributing to the sample.",
    }),
  };
}

export function toListSamplesQuery(
  query: Record<string, unknown>,
): ListSamplesQuery {
  return Object.fromEntries(
    Object.entries(query).map(([key, value]) => [
      CORE_FILTER_PARAM[key as keyof typeof CORE_FILTER_PARAM] ?? key,
      value,
    ]),
  ) as ListSamplesQuery;
}
