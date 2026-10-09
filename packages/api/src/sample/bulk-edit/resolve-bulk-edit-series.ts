import type {
  ImportIssue,
  ImportIssueCode,
} from "@projet-igsn/domain/sample/import/import-report";
import type { Sample } from "@projet-igsn/domain/sample/sample";

import { canJoinSeries } from "@projet-igsn/domain/sample/publication/can-join-series";

import type { SeriesChildCandidates } from "../import-template/resolve-import-children.ts";

import { SERIES_IGSN_HEADER, SHEETS } from "../import-template/columns.ts";
import { isEligibleSeries } from "../is-eligible-series.ts";

type SeriesCell = { row: number; sample: Sample; igsns: string[] };

const isStoredSeries = ({ sample, igsns }: SeriesCell) =>
  igsns.length <= 1 && (igsns[0] ?? null) === (sample.series?.igsn ?? null);

export async function resolveBulkEditSeries(
  cells: readonly SeriesCell[],
  candidates: SeriesChildCandidates,
): Promise<{ issues: ImportIssue[]; seriesIds: (string | null)[] }> {
  const found = await candidates.resolve([
    ...new Set(
      cells.flatMap((cell) =>
        cell.igsns.length === 1 && !isStoredSeries(cell) ? cell.igsns : [],
      ),
    ),
  ]);
  const issues: ImportIssue[] = [];
  const seriesIds = cells.map((cell) => {
    const stored = cell.sample.series?.id ?? null;
    const refuse = (code: ImportIssueCode) => {
      issues.push({
        sheet: SHEETS.samples,
        row: cell.row,
        column: SERIES_IGSN_HEADER,
        code,
      });
      return stored;
    };
    if (isStoredSeries(cell)) return stored;
    if (cell.igsns.length > 1) return refuse("series_not_eligible");
    const [igsn] = cell.igsns;
    if (igsn === undefined) return null;
    const target = found.get(igsn);
    if (target === undefined) return refuse("series_not_found");
    return candidates.canEdit(target) &&
      isEligibleSeries(target) &&
      canJoinSeries(cell.sample)
      ? target.id
      : refuse("series_not_eligible");
  });
  return { issues, seriesIds };
}
