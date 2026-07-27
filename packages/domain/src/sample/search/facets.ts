import { z } from "zod";

import type { TreeNode } from "../path/tree-node.ts";

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

// A facet query param: optional, degrading to "no filter" on any bad value
// (`.catch(undefined)`) like `search`, so a malformed URL never 400s.
const optionalFilter = <T extends z.ZodTypeAny>(schema: T) =>
  schema.optional().catch(undefined);
const textFilter = () => optionalFilter(z.string().trim().min(1));

// The public search facets: the fields marked searchable (green loupe) in the
// declaration schema. This registry is the single source of truth, consumed by
// the list query schema (below), the API filter builder, and the frontend
// sidebar, so the set is configurable in one place.
//
// A hierarchical facet reuses the admin's cascading vocabulary bundle; each tree
// node carries its own `searchable` flag (default false, no inheritance), so the
// facet cascade offers only the nodes flagged searchable at each level. A
// hierarchy value is validated against its vocabulary schema so a bad path never
// reaches the ltree cast.

// The vocabulary bundle a hierarchical facet cascades over. Mirrors
// design-system's Hierarchy (which must not import domain).
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
  | { key: string; kind: "enum"; values: readonly [string, ...string[]] }
  | { key: string; kind: "text" }
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
];

// The param keys that count as an active filter, given the current values. A
// range facet's unit is only a scale modifier: it filters nothing on its own,
// so it is dropped unless at least one of its bounds is set. Everything else is
// active once its value is defined. Consumed by the frontend to build the API
// request and to decide whether the search is filtered at all.
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

// Every URL/query param name a facet contributes (a range facet contributes
// three). Used to build the request and to detect whether any facet is active.
export function facetParamKeys(): string[] {
  return SAMPLE_FACETS.flatMap((facet) =>
    facet.kind === "numericRange"
      ? [`${facet.key}Min`, `${facet.key}Max`, `${facet.key}Unit`]
      : [facet.key],
  );
}

// The Zod shape contributed by the facets, spread into listSamplesQuerySchema
// (and the frontend URL schema). A literal object, not a loop, so the keys stay
// typed through `z.object`/`z.infer`. A numeric-range facet contributes three
// params (`<key>Min`, `<key>Max`, `<key>Unit`); every other facet one. The
// facets.spec drift-guard asserts these keys match the registry (facetParamKeys).
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
  };
}
