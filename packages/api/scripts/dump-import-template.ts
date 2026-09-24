import { writeFile } from "node:fs/promises";

import { importTemplateWorkbook } from "../src/sample/import-template/workbook.ts";

const target = process.argv[2];

if (!target) {
  console.error("usage: node scripts/dump-import-template.ts <path.xlsx>");
  process.exit(1);
}

await writeFile(target, new Uint8Array(await importTemplateWorkbook()));
console.info(`wrote ${target}`);
