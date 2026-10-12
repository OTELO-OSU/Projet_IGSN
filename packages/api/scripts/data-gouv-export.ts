import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { appUrl } from "../src/app-url.ts";
import { attachmentsDir } from "../src/attachments-dir.ts";
import { dataGouvConfig } from "../src/data-gouv/config.ts";
import { listAllPublishedSamples } from "../src/data-gouv/list-all-published-samples.ts";
import { publishToDataGouv } from "../src/data-gouv/publish-to-data-gouv.ts";
import { datasetDescription, datasetReadme } from "../src/data-gouv/readme.ts";
import { sampleCsvTables } from "../src/data-gouv/sample-csv-tables.ts";
import { createDb } from "../src/db.ts";
import { createSampleRepository } from "../src/sample/repository.ts";

const dryRunDir = process.argv[2];
const config = dataGouvConfig();
if (!dryRunDir && !config) {
  throw new Error(
    "DATA_GOUV_URL is unset: set it, or pass a directory to dry run",
  );
}

const db = createDb();
const samples = await listAllPublishedSamples(
  createSampleRepository(db, attachmentsDir),
);
await db.destroy();
const frontendUrl = appUrl("FRONTEND_URL");
const files = [datasetReadme(frontendUrl), ...sampleCsvTables(samples)];

if (dryRunDir) {
  await mkdir(dryRunDir, { recursive: true });
  for (const { fileName, content } of files) {
    await writeFile(join(dryRunDir, fileName), content);
  }
  console.info(`${samples.length} published samples written to ${dryRunDir}`);
} else if (config) {
  await publishToDataGouv(config, datasetDescription(frontendUrl), files);
  console.info(`${samples.length} published samples uploaded to ${config.url}`);
}
