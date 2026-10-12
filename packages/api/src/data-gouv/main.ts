import { appUrl } from "../app-url.ts";
import { attachmentsDir } from "../attachments-dir.ts";
import { createDb } from "../db.ts";
import { createSampleRepository } from "../sample/repository.ts";
import { dataGouvConfig } from "./config.ts";
import { listAllPublishedSamples } from "./list-all-published-samples.ts";
import { publishToDataGouv } from "./publish-to-data-gouv.ts";
import { datasetDescription, datasetReadme } from "./readme.ts";
import { sampleCsvTables } from "./sample-csv-tables.ts";
import { scheduleDataGouvExport } from "./schedule.ts";

const config = dataGouvConfig();
if (config) {
  const frontendUrl = appUrl("FRONTEND_URL");
  const samples = createSampleRepository(createDb(), attachmentsDir);
  scheduleDataGouvExport(() => {
    listAllPublishedSamples(samples)
      .then((all) =>
        publishToDataGouv(config, datasetDescription(frontendUrl), [
          datasetReadme(frontendUrl),
          ...sampleCsvTables(all),
        ]),
      )
      .catch(console.error);
  });
  process.on("SIGTERM", () => process.exit(0));
}
