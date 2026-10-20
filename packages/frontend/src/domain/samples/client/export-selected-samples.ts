import type { SearchSelectionExport } from "@projet-igsn/domain/sample/search/search-export-validator";

import { apiFetch, baseApiUrl } from "#/api.ts";

const FALLBACK_FILENAMES = {
  csv: "igsn-samples.zip",
  xlsx: "igsn-samples.xlsx",
} satisfies Record<SearchSelectionExport["format"], string>;

export async function exportSelectedSamples(
  body: SearchSelectionExport,
  fetchFn: typeof fetch = apiFetch,
): Promise<{ blob: Blob; filename: string }> {
  const res = await fetchFn(new URL("samples/export", baseApiUrl), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Failed to export the selected samples (${res.status})`);
  }
  const filename =
    /filename="([^"]+)"/.exec(
      res.headers.get("Content-Disposition") ?? "",
    )?.[1] ?? FALLBACK_FILENAMES[body.format];
  return { blob: await res.blob(), filename };
}
