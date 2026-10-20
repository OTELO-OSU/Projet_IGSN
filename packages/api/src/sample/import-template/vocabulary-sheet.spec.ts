import { GEOLOGICAL_AGES } from "@projet-igsn/domain/sample/age/geological-age";
import { COLLECTION_METHODS } from "@projet-igsn/domain/sample/collection-method/vocabulary";
import { REGION_HIERARCHY } from "@projet-igsn/domain/sample/location/region";
import { expandPaths } from "@projet-igsn/domain/sample/path/expand-paths";
import { pathSegment } from "@projet-igsn/domain/sample/path/segment";
import { PHYSIOGRAPHIC_ENVIRONMENTS } from "@projet-igsn/domain/sample/physiographic-environment/vocabulary";
import { RESOURCE_TYPE_PATHS } from "@projet-igsn/domain/sample/resource-type/vocabulary";
import { SAMPLE_TYPES } from "@projet-igsn/domain/sample/type/vocabulary";
import { describe, expect, it } from "vitest";

import type { VocabularyBlock } from "./vocabulary-sheet.ts";

import { TEMPLATE_MATERIAL_PATHS } from "./columns.ts";
import { labels } from "./labels.ts";
import { VOCABULARY_BLOCKS } from "./vocabulary-sheet.ts";

const READABLE_CODE_BLOCKS = new Set([
  "navigation_type",
  "size_unit",
  "mass_unit",
  "pressure_unit",
  "age_numeric_unit",
  "identifier_type",
]);

const isHierarchy = (block: VocabularyBlock) => block.rows[0]?.[2] !== "";

const codeOf = ([key, , path]: VocabularyBlock["rows"][number]) =>
  path === "" ? key : pathSegment(path);

const labelsOf = (id: string) =>
  VOCABULARY_BLOCKS.find((block) => block.id === id)?.rows.map(
    ([, label]) => label,
  ) ?? [];

const hierarchyPaths = (id: string) =>
  VOCABULARY_BLOCKS.filter(
    (block) => isHierarchy(block) && block.id.startsWith(`${id}_`),
  )
    .flatMap((block) => block.rows.map(([, , path]) => path))
    .sort();

describe("import template vocabulary sheet", () => {
  it("should offer a human label, never the code, in every list a researcher picks from", () => {
    const leaks = VOCABULARY_BLOCKS.filter(
      (block) => !READABLE_CODE_BLOCKS.has(block.id),
    ).flatMap((block) =>
      block.rows
        .filter((row) => row[1] === codeOf(row))
        .map((row) => `${block.id}:${codeOf(row)}`),
    );

    expect(leaks).toEqual([]);
  });

  it("should keep every label unique within its parent group, so the importer can reverse it", () => {
    const collisions = VOCABULARY_BLOCKS.flatMap((block) => {
      const seen = new Set<string>();
      return [...block.rows, ...(block.retiredRows ?? [])].flatMap(
        ([key, label]) => {
          const group = `${block.id}|${isHierarchy(block) ? key : ""}|${label}`;
          if (seen.has(group)) return [group];
          seen.add(group);
          return [];
        },
      );
    });

    expect(collisions).toEqual([]);
  });

  it.each([
    ["material", TEMPLATE_MATERIAL_PATHS],
    ["sample_type", SAMPLE_TYPES],
    ["collection_method", COLLECTION_METHODS],
    ["physiographic_environment", PHYSIOGRAPHIC_ENVIRONMENTS],
    ["resource_type", RESOURCE_TYPE_PATHS],
    ["region", expandPaths(REGION_HIERARCHY.nodes, REGION_HIERARCHY.roots)],
  ])("should hold every %s path the domain expands", (id, expected) => {
    expect(hierarchyPaths(id)).toEqual([...expected].sort());
  });

  it("should sort a dropdown's labels alphabetically", () => {
    const osus = labelsOf("osu");

    expect(osus).toEqual(
      [...osus].sort((left, right) => left.localeCompare(right)),
    );
  });

  it("should keep an ordered scale in its domain order", () => {
    expect(labelsOf("geological_age")).toEqual(
      GEOLOGICAL_AGES.map(labels.geologicalAgeLabel),
    );
  });
});
