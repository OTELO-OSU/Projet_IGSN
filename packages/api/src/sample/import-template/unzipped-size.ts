import { inflateRawSync } from "node:zlib";

const END_OF_DIRECTORY_SIGNATURE = 0x06054b50;

const DIRECTORY_ENTRY_SIGNATURE = 0x02014b50;

const END_OF_DIRECTORY_SIZE = 22;

const DIRECTORY_ENTRY_SIZE = 46;

const MAX_ARCHIVE_COMMENT = 0xffff;

const ZIP64_COUNT = 0xffff;

const ZIP64_SIZE = 0xffffffff;

const LOCAL_HEADER_SIZE = 30;

const STORED = 0;

const DEFLATED = 8;

export const MAX_UNZIPPED_BYTES = 100 * 1024 * 1024;

function endOfDirectory(view: DataView): number | undefined {
  const last = view.byteLength - END_OF_DIRECTORY_SIZE;
  const first = Math.max(0, last - MAX_ARCHIVE_COMMENT);
  for (let offset = last; offset >= first; offset--) {
    if (view.getUint32(offset, true) === END_OF_DIRECTORY_SIGNATURE)
      return offset;
  }
  return undefined;
}

function inflatedSize(
  bytes: Uint8Array,
  view: DataView,
  entry: number,
  remaining: number,
): number | undefined {
  const method = view.getUint16(entry + 10, true);
  const compressed = view.getUint32(entry + 20, true);
  if (method === STORED) return compressed;
  if (method !== DEFLATED) return undefined;
  try {
    const local = view.getUint32(entry + 42, true);
    const start =
      local +
      LOCAL_HEADER_SIZE +
      view.getUint16(local + 26, true) +
      view.getUint16(local + 28, true);
    return inflateRawSync(bytes.subarray(start, start + compressed), {
      maxOutputLength: remaining,
    }).length;
  } catch {
    return undefined;
  }
}

export function fitsUnzippedCap(
  bytes: Uint8Array,
  cap = MAX_UNZIPPED_BYTES,
): boolean {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const end = endOfDirectory(view);
  if (end === undefined) return false;
  const count = view.getUint16(end + 10, true);
  const start = view.getUint32(end + 16, true);
  if (count === ZIP64_COUNT || start === ZIP64_SIZE) return false;
  let total = 0;
  let position = start;
  for (let entry = 0; entry < count; entry++) {
    if (
      position + DIRECTORY_ENTRY_SIZE > end ||
      view.getUint32(position, true) !== DIRECTORY_ENTRY_SIGNATURE
    )
      return false;
    const size = view.getUint32(position + 24, true);
    if (
      size === ZIP64_SIZE ||
      inflatedSize(bytes, view, position, cap - total) !== size
    )
      return false;
    total += size;
    if (total > cap) return false;
    position +=
      DIRECTORY_ENTRY_SIZE +
      view.getUint16(position + 28, true) +
      view.getUint16(position + 30, true) +
      view.getUint16(position + 32, true);
  }
  return true;
}
