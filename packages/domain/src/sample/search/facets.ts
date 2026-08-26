import { z } from "zod";

import type { TreeNode } from "../path/tree-node.ts";

import { filterOrganizationsWithLaboratory } from "../../institutional-group/filter-organizations-with-laboratory.ts";
import {
  LABORATORIES,
  laboratoryCodeSchema,
} from "../../institutional-group/laboratory.ts";
import { organizationRorSchema } from "../../institutional-group/organization.ts";
import { OSUS, osuCodeSchema } from "../../institutional-group/osu.ts";
import {
  NUMERIC_UNITS,
  type NumericUnit,
  numericUnitSchema,
} from "../age/numeric-unit.ts";
import {
  collectionMethodSchema,
  COLLECTION_METHOD_HIERARCHY,
} from "../collection-method/vocabulary.ts";
import {
  materialPathSchema,
  MATERIAL_HIERARCHY,
} from "../material/classification.ts";
import { NATURES, natureSchema } from "../nature.ts";
import { TEXTURES, textureSchema } from "../texture/vocabulary.ts";
import { sampleTypeSchema, SAMPLE_TYPE_HIERARCHY } from "../type/vocabulary.ts";

const optionalFilter = <T extends z.ZodTypeAny>(schema: T) =>
  schema.optional().catch(undefined);
const textFilter = () => optionalFilter(z.string().trim().min(1));

export type SearchableHierarchy = {
  roots: readonly string[];
  nodes: Record<string, TreeNode | undefined>;
};

export type SampleFacet =
  | {
      key: string;
      kind: "hierarchy";
      hierarchy: SearchableHierarchy;
      schema: z.ZodTypeAny;
    }
  | { key: string; kind: "enum"; values: readonly string[] }
  | { key: string; kind: "text" }
  | { key: string; kind: "linked" }
  | {
      key: string;
      kind: "numericRange";
      units: readonly [NumericUnit, ...NumericUnit[]];
    };

export const SAMPLE_FACETS: readonly SampleFacet[] = [
  {
    key: "type",
    kind: "hierarchy",
    hierarchy: SAMPLE_TYPE_HIERARCHY,
    schema: sampleTypeSchema,
  },
  {
    key: "material",
    kind: "hierarchy",
    hierarchy: MATERIAL_HIERARCHY,
    schema: materialPathSchema,
  },
  {
    key: "collectionMethod",
    kind: "hierarchy",
    hierarchy: COLLECTION_METHOD_HIERARCHY,
    schema: collectionMethodSchema,
  },
  { key: "nature", kind: "enum", values: NATURES },
  { key: "texture", kind: "enum", values: TEXTURES },
  { key: "researchProgramName", kind: "text" },
  { key: "researchProgramChief", kind: "text" },
  { key: "researchCampaign", kind: "text" },
  { key: "collectorName", kind: "text" },
  { key: "collectionCurator", kind: "text" },
  { key: "age", kind: "numericRange", units: NUMERIC_UNITS },
  {
    key: "institutionalOrganization",
    kind: "enum",
    values: filterOrganizationsWithLaboratory().map((o) => o.ror),
  },
  {
    key: "institutionalOsu",
    kind: "enum",
    values: OSUS.map((o) => o.code),
  },
  {
    key: "institutionalLaboratory",
    kind: "enum",
    values: LABORATORIES.map((l) => l.code),
  },
  { key: "manualGroup", kind: "linked" },
  { key: "contributor", kind: "linked" },
];

export function activeFacetKeys(values: Record<string, unknown>): string[] {
  return SAMPLE_FACETS.flatMap((facet) => {
    if (facet.kind !== "numericRange") {
      return values[facet.key] !== undefined ? [facet.key] : [];
    }
    const hasMin = values[`${facet.key}Min`] !== undefined;
    const hasMax = values[`${facet.key}Max`] !== undefined;
    const keys: string[] = [];
    if (hasMin) keys.push(`${facet.key}Min`);
    if (hasMax) keys.push(`${facet.key}Max`);
    if ((hasMin || hasMax) && values[`${facet.key}Unit`] !== undefined) {
      keys.push(`${facet.key}Unit`);
    }
    return keys;
  });
}

export function facetParamKeys(): string[] {
  return SAMPLE_FACETS.flatMap((facet) =>
    facet.kind === "numericRange"
      ? [`${facet.key}Min`, `${facet.key}Max`, `${facet.key}Unit`]
      : [facet.key],
  );
}

export function facetQueryFields() {
  return {
    type: optionalFilter(sampleTypeSchema),
    material: optionalFilter(materialPathSchema),
    collectionMethod: optionalFilter(collectionMethodSchema),
    nature: optionalFilter(natureSchema),
    texture: optionalFilter(textureSchema),
    researchProgramName: textFilter(),
    researchProgramChief: textFilter(),
    researchCampaign: textFilter(),
    collectorName: textFilter(),
    collectionCurator: textFilter(),
    ageMin: optionalFilter(z.coerce.number()),
    ageMax: optionalFilter(z.coerce.number()),
    ageUnit: optionalFilter(numericUnitSchema),
    institutionalOrganization: optionalFilter(organizationRorSchema),
    institutionalOsu: optionalFilter(osuCodeSchema),
    institutionalLaboratory: optionalFilter(laboratoryCodeSchema),
    manualGroup: optionalFilter(z.uuid()),
    contributor: optionalFilter(z.uuid()),
  };
}
