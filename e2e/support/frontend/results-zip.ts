import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

type Zip = {
  file: (name: string) => { async: (type: "string") => Promise<string> } | null;
};

const JSZip = createRequire(
  path.join(__dirname, "../../../packages/api/package.json"),
)("jszip") as { loadAsync: (data: Buffer) => Promise<Zip> };

export async function readZipEntry(
  file: string,
  name: string,
): Promise<string> {
  const entry = (await JSZip.loadAsync(await readFile(file))).file(name);
  if (!entry) throw new Error(`the zip must hold ${name}`);
  return entry.async("string");
}
