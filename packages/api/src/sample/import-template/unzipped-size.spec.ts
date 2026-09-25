import { deflateRawSync } from "node:zlib";
import { describe, expect, it } from "vitest";

import { fitsUnzippedCap } from "./unzipped-size.ts";
import { importTemplateWorkbook } from "./workbook.ts";

const CAP = 1024;

const DEFLATED = 8;

type Entry = { data: Uint8Array; size: number; method?: number };

const deflated = (size: number): Entry => ({
  data: deflateRawSync(Buffer.alloc(size)),
  size,
});

function zipOf(entries: readonly Entry[]): Uint8Array {
  const locals = entries.map(({ data, size, method = DEFLATED }) => {
    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50, 0);
    header.writeUInt16LE(method, 8);
    header.writeUInt32LE(data.length, 18);
    header.writeUInt32LE(size, 22);
    return Buffer.concat([header, data]);
  });
  let offset = 0;
  const directory = entries.map(({ data, size, method = DEFLATED }, index) => {
    const entry = Buffer.alloc(46);
    entry.writeUInt32LE(0x02014b50, 0);
    entry.writeUInt16LE(method, 10);
    entry.writeUInt32LE(data.length, 20);
    entry.writeUInt32LE(size, 24);
    entry.writeUInt32LE(offset, 42);
    offset += locals[index]?.length ?? 0;
    return entry;
  });
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(directory.length * 46, 12);
  end.writeUInt32LE(offset, 16);
  return new Uint8Array(Buffer.concat([...locals, ...directory, end]));
}

describe("fitsUnzippedCap", () => {
  it("should accept the generated template", async () => {
    const template = new Uint8Array(await importTemplateWorkbook(3));

    expect(fitsUnzippedCap(template)).toBe(true);
  });

  it("should accept an archive inflating within the cap", () => {
    expect(fitsUnzippedCap(zipOf([deflated(CAP / 2)]), CAP)).toBe(true);
  });

  it.each([
    [
      "an entry declaring 1 byte that inflates past the cap",
      zipOf([{ data: deflateRawSync(Buffer.alloc(CAP * 2)), size: 1 }]),
    ],
    [
      "entries that together inflate past the cap",
      zipOf([deflated(CAP / 2 + 1), deflated(CAP / 2)]),
    ],
    [
      "an entry inflating to another size than it declares",
      zipOf([{ data: deflateRawSync(Buffer.alloc(10)), size: 1 }]),
    ],
    [
      "an entry compressed with an unsupported method",
      zipOf([{ ...deflated(10), method: 12 }]),
    ],
    ["bytes that are not a zip archive", new TextEncoder().encode("a,b\n1,2")],
  ])("should refuse %s", (_, bytes) => {
    expect(fitsUnzippedCap(bytes, CAP)).toBe(false);
  });
});
