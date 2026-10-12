import { sampleLandingPage } from "@projet-igsn/domain/sample/core/sample-landing-page";

import {
  CHILD_LAYOUTS,
  SAMPLES_LAYOUT,
  type CsvLayout,
  type ExportFile,
} from "./sample-csv-tables.ts";

const introOf = (
  frontendUrl: string,
): string => `IGSN-CNRS is a registry of geoscience samples within the Solid Earth scope.
Every rock, sediment, mineral, synthetic or extraterrestrial sample registered there receives an IGSN (International Generic Sample Number): a unique identifier, used worldwide, that makes the sample findable and citable without ambiguity.

This dataset gathers every sample published in the registry, sub-samples included, so you can explore, map or cross-reference these collections without browsing the website one sample at a time.

## What you will find

- **Where** each sample comes from: coordinates, region, locality, collection date and method.
- **What** it is: nature, material, texture, age, dimensions, and any safety warning (radioactivity, asbestos, chemical risk).
- **Who** is behind it: collector, chief scientist, research programme, funders, and the laboratory and OSU that keep it today.
- **How** it is kept: packaging, storage conditions, and whether it still exists and can be accessed.
- **How** it connects: its parent samples, the sub-samples prepared from it (thin sections, powders...), and related publications or datasets.

## Going further

- \`${sampleLandingPage("<igsn>", frontendUrl)}\` opens the public page of any sample from its \`igsn\`.
- Researchers can declare their own samples with a free account at ${frontendUrl}.
- The dataset is refreshed on the 1st of each month, each refresh replacing the files in place so their links stay stable.

IGSN-CNRS was initiated by CNRS through INSU, is led by OSU OTELo and funded by GaiaData.`;

const CONVENTIONS = `## How to read the files

- Files are UTF-8, comma-separated and quoted per RFC 4180, with a header row.
- \`samples.csv\` holds one row per sample; every other file holds one row per item, keyed by the \`igsn\` of its sample.
- An empty cell means no value.
- Controlled vocabularies hold stable codes, not labels.
- A hierarchy is one dot-separated path from the broadest level down, such as \`rock_and_sediment.rock.igneous\`.
- Several values in one cell are separated by \`|\`.
- Dates follow ISO 8601.
- An organisation is identified by its ROR id, an OSU or a laboratory by its code, and the next column, ending in \`_name\`, gives its name.
- A text cell starting with \`=\`, \`+\`, \`-\`, \`@\`, a tab or a carriage return is prefixed with \`'\` so spreadsheets do not run it as a formula: drop that \`'\` to read the original value.`;

const LICENSE = `## License

This dataset is distributed under the CeCILL 2.1 license (https://cecill.info/licences/Licence_CeCILL_V2.1-en.html), the license of the registry's source code.`;

export const datasetDescription = (frontendUrl: string): string =>
  [
    introOf(frontendUrl),
    "The `README.txt` resource documents every column of every file and how to read them.",
    LICENSE,
  ].join("\n\n");

const sectionOf = (
  { fileName, title, columns }: CsvLayout,
  key: readonly { header: string; label: string }[],
): string =>
  [
    `### \`${fileName}\`: ${title}`,
    "",
    "| Column | Description |",
    "| --- | --- |",
    ...[...key, ...columns].map(
      ({ header, label }) => `| \`${header}\` | ${label} |`,
    ),
  ].join("\n");

export const datasetReadme = (frontendUrl: string): ExportFile => ({
  fileName: "README.txt",
  content: `${[
    "# IGSN-CNRS samples: open data export",
    introOf(frontendUrl),
    CONVENTIONS,
    LICENSE,
    "## Files",
    sectionOf(SAMPLES_LAYOUT, []),
    ...CHILD_LAYOUTS.map((layout) =>
      sectionOf(layout, [{ header: "igsn", label: "IGSN of the sample" }]),
    ),
  ].join("\n\n")}\n`,
});
