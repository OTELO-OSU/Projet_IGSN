import type {
  ImportIssue,
  ImportIssueCode,
} from "@projet-igsn/domain/sample/import/import-report";
import type { Sample } from "@projet-igsn/domain/sample/sample";

import { inheritedCollectionDate } from "@projet-igsn/domain/sample/parent/inherited-collection-date";

import type { SampleCandidate } from "./build-sample-inputs.ts";

import { valueAt } from "./build-sample-inputs.ts";
import { leavesOf, placeOf } from "./validate-samples.ts";

type Json = Record<string, unknown>;

export type ResolveParentsByIgsn = (
  igsns: string[],
) => Promise<ReadonlyMap<string, Sample>>;

const INHERITED: readonly { path: string[]; code: ImportIssueCode }[] = [
  { path: ["location"], code: "location_inherited_from_parent" },
  {
    path: ["description", "collectionDate"],
    code: "collection_date_inherited_from_parent",
  },
];

export const INHERITED_PATHS = INHERITED.map(({ path }) => path.join("."));

const isParented = (sample: SampleCandidate) =>
  sample.input.parentIds !== undefined;

const igsnsOf = (sample: SampleCandidate) =>
  String(sample.input.parentIds)
    .trim()
    .split(/[\s,;]+/);

const without = (value: unknown, key: string): Json =>
  Object.fromEntries(
    Object.entries((value ?? {}) as Json).filter(([name]) => name !== key),
  );

function inheriting(input: Json, parent: Sample | undefined): Json {
  const rest = without(without(input, "parentIds"), "location");
  const description = without(input.description, "collectionDate");
  if (parent === undefined) return { ...rest, description };
  return {
    ...rest,
    parentIds: [parent.id],
    description: {
      ...description,
      collectionDate: inheritedCollectionDate([
        parent.description?.collectionDate,
      ]),
    },
  };
}

function conflictsOf(sample: SampleCandidate): ImportIssue[] {
  return INHERITED.flatMap(({ path, code }) =>
    leavesOf(valueAt(sample.input, path), path)
      .slice(0, 1)
      .map((leaf) => ({ ...placeOf(sample, leaf), code })),
  );
}

export async function resolveImportParents(
  samples: readonly SampleCandidate[],
  resolve: ResolveParentsByIgsn,
): Promise<{ issues: ImportIssue[]; samples: SampleCandidate[] }> {
  const parents = await resolve([
    ...new Set(
      samples.filter(isParented).flatMap((sample) => {
        const igsns = igsnsOf(sample);
        return igsns.length === 1 ? igsns : [];
      }),
    ),
  ]);
  const issues: ImportIssue[] = [];
  const resolved = samples.map((sample): SampleCandidate => {
    if (!isParented(sample)) return sample;
    const igsns = igsnsOf(sample);
    const parent = igsns.length === 1 ? parents.get(igsns[0]!) : undefined;
    const found: ImportIssue[] = [
      ...(parent === undefined
        ? [
            {
              ...placeOf(sample, ["parentIds"]),
              code:
                igsns.length > 1 ? "multiple_parent_igsns" : "parent_not_found",
            } as const,
          ]
        : []),
      ...conflictsOf(sample),
    ];
    issues.push(...found);
    return {
      ...sample,
      input: inheriting(sample.input, found.length === 0 ? parent : undefined),
    };
  });
  return { issues, samples: resolved };
}
