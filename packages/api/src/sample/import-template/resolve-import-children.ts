import type {
  ImportIssue,
  ImportIssueCode,
} from "@projet-igsn/domain/sample/import/import-report";
import type { SeriesLinkCandidate } from "@projet-igsn/domain/sample/repository";
import type { Sample } from "@projet-igsn/domain/sample/sample";

import type { SampleCandidate } from "./build-sample-inputs.ts";

import { isEligibleChild } from "../is-eligible-child.ts";
import { CHILDREN_IGSNS_HEADER, SHEETS } from "./columns.ts";

export type SeriesChildren = {
  igsns: string[];
  series: Pick<Sample, "id" | "children">;
};

export type SeriesChildCandidates = {
  resolve: (
    igsns: string[],
  ) => Promise<ReadonlyMap<string, SeriesLinkCandidate>>;
  canEdit: (candidate: SeriesLinkCandidate) => boolean;
};

export type SeriesChildrenSource = SeriesChildCandidates & {
  of: (index: number) => SeriesChildren;
};

export async function resolveImportChildren(
  samples: readonly SampleCandidate[],
  source: SeriesChildrenSource | undefined,
): Promise<{ issues: ImportIssue[]; samples: SampleCandidate[] }> {
  if (source === undefined) return { issues: [], samples: [...samples] };
  const listed = samples.map((_sample, index) => {
    const { igsns, series } = source.of(index);
    const held = new Map(
      series.children.map(({ id, igsn }) => [igsn, id] as const),
    );
    return { igsns, seriesId: series.id, held };
  });
  const children = await source.resolve([
    ...new Set(
      listed.flatMap(({ igsns, held }) =>
        igsns.filter((igsn) => !held.has(igsn)),
      ),
    ),
  ]);
  const rowsCiting = Map.groupBy(
    listed.flatMap(({ igsns }) => [...new Set(igsns)]),
    (igsn) => igsn,
  );
  const issues: ImportIssue[] = [];
  const resolved = samples.map((sample, index): SampleCandidate => {
    const listing = listed[index]!;
    const codes = new Set<ImportIssueCode>();
    const childIds: string[] = [];
    const isClaimable = (child: SeriesLinkCandidate) =>
      source.canEdit(child) && isEligibleChild(child, listing.seriesId);
    for (const igsn of listing.igsns) {
      const child = children.get(igsn);
      const id =
        listing.held.get(igsn) ??
        (child && isClaimable(child) ? child.id : undefined);
      if (id === undefined)
        codes.add(
          child === undefined ? "child_not_found" : "child_not_eligible",
        );
      else if (rowsCiting.get(igsn)!.length > 1)
        codes.add("child_in_several_rows");
      else childIds.push(id);
    }
    issues.push(
      ...[...codes].map((code) => ({
        sheet: SHEETS.samples,
        row: sample.row,
        column: CHILDREN_IGSNS_HEADER,
        code,
      })),
    );
    return { ...sample, input: { ...sample.input, childIds } };
  });
  return { issues, samples: resolved };
}
