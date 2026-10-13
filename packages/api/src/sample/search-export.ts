import type { SampleRepository } from "@projet-igsn/domain/sample/repository";
import type { ListSamplesQuery } from "@projet-igsn/domain/sample/sample-validator";

import { HTTPException } from "hono/http-exception";
import JSZip from "jszip";

import { searchReadme } from "../data-gouv/readme.ts";
import { sampleCsvTables } from "../data-gouv/sample-csv-tables.ts";
import { searchExportLimit } from "./search-export-limit.ts";

export async function searchExportResponse(
  repository: SampleRepository,
  query: Omit<ListSamplesQuery, "page" | "perPage">,
): Promise<Response> {
  const { data, total } = await repository.listPublished({
    ...query,
    page: 1,
    perPage: searchExportLimit,
  });
  if (total > searchExportLimit) {
    throw new HTTPException(422, {
      message: `Cannot export more than ${searchExportLimit} samples`,
    });
  }
  const zip = new JSZip();
  for (const { fileName, content } of [
    searchReadme(),
    ...sampleCsvTables(data),
  ]) {
    zip.file(fileName, content);
  }
  const date = new Date().toISOString().slice(0, 10);
  return new Response(
    await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" }),
    {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="igsn-samples-${date}.zip"`,
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}
