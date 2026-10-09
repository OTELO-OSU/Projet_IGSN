import type { SampleProcessStep } from "@projet-igsn/domain/sample/process-step/model";
import type { CreateSample, Sample } from "@projet-igsn/domain/sample/sample";
import type { Kysely } from "kysely";

import { formatInternalId } from "@projet-igsn/domain/sample/format-internal-id";
import ExcelJS from "exceljs";
import { describe, expect } from "vitest";

import type { DB } from "../../db.ts";

import { insertUser } from "../../tests/insert-user.ts";
import { pgTest } from "../../tests/pg-test.ts";
import { readSample } from "../../tests/read-sample.ts";
import { publishableSample } from "../../tests/sample-fixtures.ts";
import { SHEETS } from "../import-template/columns.ts";
import {
  deleteColumn,
  fill,
  sheetOf,
} from "../import-template/import-fixture.ts";
import { resolvePublishedParents } from "../import-template/resolve-published-parents.ts";
import { insertSample } from "../service/insert-sample.ts";
import { listDescendantIds } from "../service/list-descendant-ids.ts";
import { listPublishedSamplesByIgsns } from "../service/list-published-samples-by-igsns.ts";
import { publishSample } from "../service/publish-sample.ts";
import { updateSample } from "../service/update-sample.ts";
import { exportWorkbook } from "./export-workbook.ts";
import { validateBulkEdit } from "./validate-bulk-edit.ts";

const ROW = 3;

const RELATION = {
  identifierType: "doi",
  identifier: "https://doi.org/10.1234/abc",
  relationType: "is_cited_by",
  targetResourceType: "book",
} as const;

const STORED = {
  ...publishableSample,
  localId: "L-1",
  repository: {
    ...publishableSample.repository,
    currentArchiveContactEmail: "archive-bulk-edit@univ-lorraine.fr",
  },
  relations: [RELATION],
} satisfies CreateSample;

async function published(
  db: Kysely<DB>,
  input: CreateSample = STORED,
): Promise<Sample> {
  const { id } = await insertSample(db, input);
  await publishSample(db, id);
  return (await readSample(db, id))!;
}

const DAY_STEP: SampleProcessStep = {
  kind: "subsampling",
  date: { precision: "day", start: "2024-06-05", end: "2024-06-06" },
  description: "Sawn into three slabs",
};

async function publishedSubSample(
  db: Kysely<DB>,
  processSteps: SampleProcessStep[],
): Promise<{ parent: Sample; sample: Sample }> {
  const parent = await published(db);
  const sample = await published(db, {
    ...STORED,
    parentIds: [parent.id],
    processSteps,
  });
  return { parent, sample };
}

const PREPARATION_CELLS = {
  Kind: "Preparation",
  "Date precision": "Day",
  "Date start": "2024-07-01",
  "Date end": "2024-07-01",
};

const keyOf = ({ internalNumber }: Sample) => formatInternalId(internalNumber!);

async function exported(samples: Sample[]): Promise<ExcelJS.Workbook> {
  const book = new ExcelJS.Workbook();
  await book.xlsx.load(await exportWorkbook(samples));
  return book;
}

async function validated(
  db: Kysely<DB>,
  book: ExcelJS.Workbook,
  samples: Sample[],
) {
  const bytes = new Uint8Array(await book.xlsx.writeBuffer()).buffer;
  return validateBulkEdit(
    bytes,
    async (numbers) => {
      const found = samples.filter(
        ({ internalNumber }) =>
          internalNumber !== null && numbers.includes(internalNumber),
      );
      return new Map(
        found.map((sample) => [sample.internalNumber!, { sample }]),
      );
    },
    { resolve: async () => new Map(), canEdit: () => false },
    (igsns) =>
      resolvePublishedParents(
        {
          listPublishedByIgsns: (igsns) =>
            listPublishedSamplesByIgsns(db, igsns),
        },
        igsns,
      ),
    (ids) => listDescendantIds(db, ids),
  );
}

const issue = (column: string, code: string, sheet: string = SHEETS.samples) =>
  expect.objectContaining({ sheet, row: ROW, column, code });

describe("validateBulkEdit", () => {
  pgTest(
    "should accept an unmodified export and change no field",
    async ({ db }) => {
      const collector = await insertUser(db, "collector@example.com", {
        firstname: "Marie",
        name: "Curie",
        orcid: "0000-0002-1825-0097",
      });
      const sample = await published(db, {
        ...STORED,
        scientificContext: {
          provenanceStatus: "research_project_sample",
          collectorUserId: collector.id,
          additionalRoles: [],
        },
      });
      await db
        .insertInto("sample_attachment")
        .values({
          id: crypto.randomUUID(),
          sample_id: sample.id,
          name: "scan.pdf",
          media_type: "application/pdf",
          target_resource_type: "book",
        })
        .execute();
      const stored = (await readSample(db, sample.id))!;

      const { issues, samples } = await validated(
        db,
        await exported([stored]),
        [stored],
      );
      await updateSample(db, stored.id, samples[0]!.input);

      expect({ issues, ids: samples.map(({ id }) => id) }).toEqual({
        issues: [],
        ids: [stored.id],
      });
      expect(await readSample(db, stored.id)).toEqual({
        ...stored,
        relations: stored.relations.map((relation) => ({
          ...relation,
          id: expect.any(String),
        })),
        synchronizationStatus: "pending",
        updatedAt: expect.any(Date),
      });
    },
    30_000,
  );

  pgTest(
    "should keep the value of a column absent from the Samples sheet",
    async ({ db }) => {
      const sample = await published(db);
      const book = await exported([sample]);
      deleteColumn(book, SHEETS.samples, "Local ID");

      const { samples } = await validated(db, book, [sample]);

      expect(samples[0]?.input.localId).toBe("L-1");
    },
    30_000,
  );

  pgTest(
    "should clear the value of an emptied cell",
    async ({ db }) => {
      const sample = await published(db);
      const book = await exported([sample]);
      fill(book, SHEETS.samples, ROW, { "Local ID": null });

      const { issues, samples } = await validated(db, book, [sample]);

      expect({ issues, localId: samples[0]?.input.localId }).toEqual({
        issues: [],
        localId: undefined,
      });
    },
    30_000,
  );

  pgTest(
    "should change the research programme kind of a published sample",
    async ({ db }) => {
      const sample = await published(db, {
        ...STORED,
        scientificContext: {
          provenanceStatus: "research_project_sample",
          researchProgramName: "MD-245",
          researchProgramKind: "program",
          collectorFirstname: "Marie",
          collectorLastname: "Curie",
          additionalRoles: [],
        },
      });
      const book = await exported([sample]);
      fill(book, SHEETS.samples, ROW, { "Research program kind": "Cruise" });

      const { issues, samples } = await validated(db, book, [sample]);
      await updateSample(db, sample.id, samples[0]!.input);

      expect(issues).toEqual([]);
      expect((await readSample(db, sample.id))?.scientificContext).toEqual({
        ...sample.scientificContext,
        researchProgramKind: "cruise",
      });
    },
    30_000,
  );

  pgTest(
    "should keep the list of a child sheet absent from the file",
    async ({ db }) => {
      const sample = await published(db);
      const book = await exported([sample]);
      book.removeWorksheet(sheetOf(book, SHEETS.relations).id);

      const { samples } = await validated(db, book, [sample]);

      expect(samples[0]?.input.relations).toEqual([
        expect.objectContaining(RELATION),
      ]);
    },
    30_000,
  );

  pgTest(
    "should empty the list of a present child sheet with no row for the sample",
    async ({ db }) => {
      const sample = await published(db);
      const book = await exported([sample]);
      sheetOf(book, SHEETS.relations).spliceRows(ROW, 1);

      const { issues, samples } = await validated(db, book, [sample]);

      expect({ issues, relations: samples[0]?.input.relations ?? [] }).toEqual({
        issues: [],
        relations: [],
      });
    },
    30_000,
  );

  pgTest(
    "should refuse a present child sheet missing one of its columns",
    async ({ db }) => {
      const sample = await published(db);
      const book = await exported([sample]);
      deleteColumn(book, SHEETS.relations, "Title");

      const { issues } = await validated(db, book, [sample]);

      expect(issues).toEqual([
        { sheet: SHEETS.relations, column: "Title", code: "missing_column" },
      ]);
    },
    30_000,
  );

  pgTest.for([
    ["IGSN", "OTHER1234"],
    ["Parent IGSN", "PARENT1234"],
    ["Collection origin", "purchase"],
    ["Material (level 2)", "rock"],
  ])(
    "should refuse a changed frozen cell %s",
    { timeout: 30_000 },
    async ([column, value], { db }) => {
      const { sample } = await publishedSubSample(db, []);
      const book = await exported([sample]);
      fill(book, SHEETS.samples, ROW, { [column!]: value });

      const { issues, samples } = await validated(db, book, [sample]);

      expect({ issues, samples }).toEqual({
        issues: expect.arrayContaining([issue(column!, "frozen_field")]),
        samples: [],
      });
    },
  );

  pgTest(
    "should accept a deeper material level below the frozen prefix",
    async ({ db }) => {
      const sample = await published(db, {
        ...STORED,
        material: "rock_and_sediment.sediment.exogenous_detritic",
      });
      const book = await exported([sample]);
      fill(book, SHEETS.samples, ROW, { "Material (level 4)": "clay" });

      const { issues, samples } = await validated(db, book, [sample]);

      expect({ issues, material: samples[0]?.input.material }).toEqual({
        issues: [],
        material: "rock_and_sediment.sediment.exogenous_detritic.clay",
      });
    },
    30_000,
  );

  pgTest(
    "should report the blocker of a cleared publish-required field",
    async ({ db }) => {
      const sample = await published(db);
      const book = await exported([sample]);
      fill(book, SHEETS.samples, ROW, { "Existence status": null });

      const { issues } = await validated(db, book, [sample]);

      expect(issues).toEqual(
        expect.arrayContaining([
          issue("Existence status", "existence_status_missing"),
        ]),
      );
    },
    30_000,
  );

  pgTest(
    "should replace a published sub-sample's stored steps with its Process steps rows, its parent unchanged",
    async ({ db }) => {
      const { sample } = await publishedSubSample(db, [DAY_STEP]);
      const book = await exported([sample]);
      fill(book, SHEETS.processSteps, ROW, {
        Description: "Broken with a hammer",
      });
      fill(book, SHEETS.processSteps, ROW + 1, {
        "Sample #": keyOf(sample),
        ...PREPARATION_CELLS,
      });

      const { issues, samples } = await validated(db, book, [sample]);
      await updateSample(db, sample.id, samples[0]!.input);
      const stored = await readSample(db, sample.id);

      expect({
        issues,
        processSteps: stored?.processSteps,
        parents: stored?.parents,
      }).toEqual({
        issues: [],
        processSteps: [
          { ...DAY_STEP, description: "Broken with a hammer" },
          {
            kind: "preparation",
            date: { precision: "day", start: "2024-07-01", end: "2024-07-01" },
            description: null,
          },
        ],
        parents: sample.parents,
      });
    },
    30_000,
  );

  pgTest(
    "should refuse a Process steps row on a parentless published sample",
    async ({ db }) => {
      const { parent, sample } = await publishedSubSample(db, []);
      const book = await exported([parent, sample]);
      fill(book, SHEETS.processSteps, ROW, {
        "Sample #": keyOf(parent),
        ...PREPARATION_CELLS,
      });

      const { issues, samples } = await validated(db, book, [parent, sample]);

      expect({ issues, samples }).toEqual({
        issues: [
          issue(
            "Sample #",
            "process_steps_without_parent",
            SHEETS.processSteps,
          ),
        ],
        samples: [],
      });
    },
    30_000,
  );

  pgTest(
    "should add the parent a parentless row names, dropping its location and collection date for the inherited ones",
    async ({ db }) => {
      const parent = await published(db);
      const sample = await published(db, {
        ...STORED,
        description: {
          collectionDate: {
            precision: "day",
            start: "2025-03-01",
            end: "2025-03-01",
          },
        },
      });
      const book = await exported([sample]);
      fill(book, SHEETS.samples, ROW, { "Parent IGSN": parent.igsn });

      const { issues, samples } = await validated(db, book, [sample]);

      expect({
        issues,
        parentIds: samples[0]?.input.parentIds,
        location: samples[0]?.input.location,
        collectionDate: samples[0]?.input.description?.collectionDate,
      }).toEqual({
        issues: [],
        parentIds: [parent.id],
        location: undefined,
        collectionDate: parent.description?.collectionDate,
      });
    },
    30_000,
  );

  pgTest.for(["itself", "its child"] as const)(
    "should refuse a parentless row naming %s as its parent",
    { timeout: 30_000 },
    async (target, { db }) => {
      const { parent: sample, sample: child } = await publishedSubSample(
        db,
        [],
      );
      const book = await exported([sample]);
      fill(book, SHEETS.samples, ROW, {
        "Parent IGSN": target === "itself" ? sample.igsn : child.igsn,
      });

      const { issues, samples } = await validated(db, book, [sample]);

      expect({ issues, samples }).toEqual({
        issues: [issue("Parent IGSN", "parent_cycle")],
        samples: [],
      });
    },
  );

  pgTest(
    "should refuse two parentless rows naming each other as parent",
    async ({ db }) => {
      const first = await published(db);
      const second = await published(db);
      const book = await exported([first, second]);
      fill(book, SHEETS.samples, ROW, { "Parent IGSN": second.igsn });
      fill(book, SHEETS.samples, ROW + 1, { "Parent IGSN": first.igsn });

      const { issues, samples } = await validated(db, book, [first, second]);

      expect({ issues, samples }).toEqual({
        issues: [
          issue("Parent IGSN", "parent_cycle"),
          expect.objectContaining({
            sheet: SHEETS.samples,
            row: ROW + 1,
            column: "Parent IGSN",
            code: "parent_cycle",
          }),
        ],
        samples: [],
      });
    },
    30_000,
  );
});
