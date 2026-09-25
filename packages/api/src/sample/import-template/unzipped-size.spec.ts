import { describe, expect, it } from "vitest";

import { fitsUnzippedCap, MAX_UNZIPPED_BYTES } from "./unzipped-size.ts";
import { importTemplateWorkbook } from "./workbook.ts";

const ENTRY_SIZE = 46;

const EOCD_SIZE = 22;

const archiveDeclaring = (sizes: readonly number[]) => {
  const directory = sizes.length * ENTRY_SIZE;
  const bytes = new Uint8Array(directory + EOCD_SIZE);
  const view = new DataView(bytes.buffer);
  for (const [index, size] of sizes.entries()) {
    view.setUint32(index * ENTRY_SIZE, 0x02014b50, true);
    view.setUint32(index * ENTRY_SIZE + 24, size, true);
  }
  view.setUint32(directory, 0x06054b50, true);
  view.setUint16(directory + 10, sizes.length, true);
  view.setUint32(directory + 12, directory, true);
  view.setUint32(directory + 16, 0, true);
  return bytes;
};

describe("fitsUnzippedCap", () => {
  it("should accept the generated template", async () => {
    const template = new Uint8Array(await importTemplateWorkbook(3));

    expect(fitsUnzippedCap(template)).toBe(true);
  });

  it.each([
    [
      "an archive whose entries together declare more than the cap",
      archiveDeclaring([MAX_UNZIPPED_BYTES / 2, MAX_UNZIPPED_BYTES / 2 + 1]),
    ],
    ["bytes that are not a zip archive", new TextEncoder().encode("a,b\n1,2")],
  ])("should refuse %s", (_, bytes) => {
    expect(fitsUnzippedCap(bytes)).toBe(false);
  });
});
