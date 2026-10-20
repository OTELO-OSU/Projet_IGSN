import type { SampleRepository } from "@projet-igsn/domain/sample/repository";
import type { Sample } from "@projet-igsn/domain/sample/sample";
import type { ListSamplesQuery } from "@projet-igsn/domain/sample/sample-validator";
import type {
  SearchExportFormat,
  SearchSelectionExport,
} from "@projet-igsn/domain/sample/search/search-export-validator";

import { HTTPException } from "hono/http-exception";
import JSZip from "jszip";

import { searchReadme } from "../data-gouv/readme.ts";
import { sampleCsvTables } from "../data-gouv/sample-csv-tables.ts";
import { exportPublicSampleWorkbook } from "./bulk-edit/export-workbook.ts";
import { xlsxResponse } from "./import-template/xlsx-response.ts";
import { searchExportLimits } from "./search-export-limit.ts";

function assertWithinLimit(count: number, format: SearchExportFormat) {
  const limit = searchExportLimits[format];
  if (count > limit) {
    throw new HTTPException(422, {
      message: `Cannot export more than ${limit} samples`,
    });
  }
}

export async function samplesExportResponse(
  samples: readonly Sample[],
  format: SearchExportFormat,
  baseName = `igsn-samples-${new Date().toISOString().slice(0, 10)}`,
): Promise<Response> {
  if (format === "xlsx") {
    return xlsxResponse(
      await exportPublicSampleWorkbook(samples),
      `${baseName}.xlsx`,
    );
  }
  const zip = new JSZip();
  for (const { fileName, content } of [
    searchReadme(),
    ...sampleCsvTables(samples),
  ]) {
    zip.file(fileName, content);
  }
  return new Response(
    await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" }),
    {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${baseName}.zip"`,
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}

export async function searchExportResponse(
  repository: SampleRepository,
  {
    format,
    ...query
  }: Omit<ListSamplesQuery, "page" | "perPage"> & {
    format: SearchExportFormat;
  },
): Promise<Response> {
  const { data, total } = await repository.listPublished({
    ...query,
    page: 1,
    perPage: searchExportLimits[format],
  });
  assertWithinLimit(total ?? Infinity, format);
  return samplesExportResponse(data, format);
}

export async function selectionExportResponse(
  repository: SampleRepository,
  { format, igsns }: SearchSelectionExport,
): Promise<Response> {
  assertWithinLimit(igsns.length, format);
  const samples = await repository.listPublishedByIgsns(igsns);
  return samplesExportResponse([...samples.values()], format);
}
