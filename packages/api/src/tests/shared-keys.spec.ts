import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const API_ROOT = path.resolve(import.meta.dirname, "../..");
const KEY =
  /[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|(?<![\w.+-])[\w.+-]+@(?!example\.com)[a-z0-9-]+(?:\.[a-z0-9-]+)+|\b\d{4}-\d{4}-\d{4}-\d{3}[\dX]\b/g;

const dbSpecs = ["src", "scripts"]
  .flatMap((dir) =>
    readdirSync(path.join(API_ROOT, dir), { recursive: true, encoding: "utf8" })
      .filter((file) => file.endsWith(".spec.ts"))
      .map((file) => path.join(dir, file)),
  )
  .map((file): [string, string] => [
    file,
    readFileSync(path.join(API_ROOT, file), "utf8"),
  ])
  .filter(([, text]) => text.includes("pgTest"));

describe("database spec files", () => {
  it("should share no id, email or ORCID another file inserts in parallel", () => {
    const owners = new Map<string, string[]>();
    for (const [file, text] of dbSpecs)
      for (const key of new Set(text.match(KEY)))
        owners.set(key, [...(owners.get(key) ?? []), file]);
    const shared = [...owners].filter(([, files]) => files.length > 1);
    expect(Object.fromEntries(shared)).toEqual({});
  });
});
