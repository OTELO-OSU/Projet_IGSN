import type { Kysely } from "kysely";

import { MAX_SEARCH_EXPORT_ROWS } from "@projet-igsn/domain/sample/search/max-search-export-rows";
import JSZip from "jszip";
import { describe, expect } from "vitest";

import type { DB } from "../db.ts";

import { createApp } from "../app.ts";
import { sampleCsvTables } from "../data-gouv/sample-csv-tables.ts";
import { insertOwned } from "../tests/insert-owned.ts";
import { insertParent } from "../tests/insert-parent.ts";
import { insertUser } from "../tests/insert-user.ts";
import { pgTest } from "../tests/pg-test.ts";
import { publishableSample } from "../tests/sample-fixtures.ts";

const exportSamples = (db: Kysely<DB>, query: string) =>
  createApp(db).app.request(`/samples/export?${query}`);

describe("GET /samples/export", () => {
  pgTest(
    "should answer the published samples matching the search as a dated zip of the open data CSVs",
    async ({ db }) => {
      const owner = await insertUser(db, "search-export-owner@example.org");
      const matching = await insertParent(
        db,
        owner.id,
        "published",
        "Granite rose",
      );
      await insertParent(db, owner.id, "draft", "Granite rose");
      const withdrawn = await insertParent(
        db,
        owner.id,
        "withdrawn",
        "Granite rose",
      );
      const other = await insertParent(
        db,
        owner.id,
        "published",
        "Basalte noir",
      );
      const subSample = await insertOwned(db, owner.id, {
        name: "Granite rose",
        parentIds: [matching.id],
        location: undefined,
      });

      const res = await exportSamples(db, "search=granite");
      const zip = await JSZip.loadAsync(await res.arrayBuffer());
      const samplesCsv = await zip.file("samples.csv")!.async("string");

      expect({
        status: res.status,
        mediaType: res.headers.get("Content-Type"),
        disposition: res.headers.get("Content-Disposition"),
        sniff: res.headers.get("X-Content-Type-Options"),
        files: Object.keys(zip.files),
        rows: samplesCsv.trim().split("\n").length - 1,
        exported: [matching, withdrawn, other, subSample].map(({ igsn }) =>
          samplesCsv.includes(igsn!),
        ),
      }).toEqual({
        status: 200,
        mediaType: "application/zip",
        disposition: expect.stringMatching(
          /^attachment; filename="igsn-samples-\d{4}-\d{2}-\d{2}\.zip"$/,
        ),
        sniff: "nosniff",
        files: [
          "README.txt",
          ...sampleCsvTables([]).map(({ fileName }) => fileName),
        ],
        rows: 1,
        exported: [true, false, false, false],
      });
    },
    30_000,
  );

  pgTest(
    "should refuse more matching samples than the export cap as 422",
    async ({ db }) => {
      await db
        .insertInto("sample")
        .values(
          Array.from({ length: MAX_SEARCH_EXPORT_ROWS + 1 }, (_, index) => ({
            id: crypto.randomUUID(),
            name: `Sample ${index}`,
            igsn: `CNRS${String(index).padStart(10, "0")}`,
            material: publishableSample.material,
            status: "published" as const,
          })),
        )
        .execute();

      const res = await exportSamples(db, "");

      expect(res.status).toBe(422);
    },
    30_000,
  );
});
