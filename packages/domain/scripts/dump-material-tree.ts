import { MATERIAL_PATHS } from "../src/sample/material/classification.ts";

for (const path of MATERIAL_PATHS) {
  const segments = path.split(".");
  console.log(`${"  ".repeat(segments.length - 1)}${segments.at(-1)}`);
}
