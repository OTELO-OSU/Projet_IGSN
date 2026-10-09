import type { Sample } from "@projet-igsn/domain/sample/sample";

export const withSeriesId = (
  sample: Sample,
): Sample & { seriesId: string | null } => ({
  ...sample,
  seriesId: sample.series?.id ?? null,
});
