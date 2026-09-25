import type { MineralClassification } from "@projet-igsn/domain/sample/mineral/model";
import type { CreateSample } from "@projet-igsn/domain/sample/sample";

import { describe, expect } from "vitest";

import type { DB } from "../../db.ts";
import type { Transactional } from "../../transaction.ts";

import { listAsOwner } from "../../tests/list-as-owner.ts";
import { pgTest } from "../../tests/pg-test.ts";
import { readSample } from "../../tests/read-sample.ts";
import { insertSample } from "./insert-sample.ts";
import { updateSample } from "./update-sample.ts";

const MUSCOVITE = 2815;
const AJOITE = 66;

const row = (
  strunzId: string,
  mindatId: number | null = null,
  abundance: MineralClassification["abundance"] = null,
): MineralClassification => ({ strunzId, mindatId, abundance });

const mineralSample = (
  mineralClassifications?: MineralClassification[],
): CreateSample => ({
  name: "Minas Gerais Beryl",
  nature: "hand_sample",
  type: null,
  material: "rock_and_sediment.mineral",
  collectionMethod: null,
  mineralClassifications,
});

const storedRows = (db: Transactional<DB>, sampleId: string) =>
  db
    .selectFrom("mineral_classification")
    .selectAll()
    .where("sample_id", "=", sampleId)
    .execute();

describe("sample mineral classifications persistence", () => {
  pgTest(
    "should read the rows back sorted by Strunz path, then by mineral code",
    async ({ db }) => {
      // Arrange
      const muscovite = row("9.E", MUSCOVITE, "major");
      const silicates = row("9");
      const sulfides = row("2.B-E");
      const ajoite = row("9.E", AJOITE);
      // Act
      const created = await insertSample(
        db,
        mineralSample([muscovite, silicates, sulfides, ajoite]),
      );
      // Assert
      expect(created.mineralClassifications).toEqual([
        sulfides,
        silicates,
        ajoite,
        muscovite,
      ]);
      expect(await readSample(db, created.id)).toEqual(created);
    },
  );

  pgTest.for([
    { rule: "replace them", rows: [row("4.F-G")], expected: [row("4.F-G")] },
    { rule: "carry none, clearing them", rows: [], expected: [] },
    { rule: "omit them, clearing them", rows: undefined, expected: [] },
  ])(
    "should store what the update carries when the rows $rule",
    async ({ rows, expected }, { db }) => {
      // Arrange
      const created = await insertSample(
        db,
        mineralSample([row("9"), row("9.E", MUSCOVITE, "major")]),
      );
      // Act
      const updated = await updateSample(db, created.id, mineralSample(rows));
      // Assert
      expect(updated?.mineralClassifications).toEqual(expected);
      expect(await storedRows(db, created.id)).toHaveLength(expected.length);
    },
  );

  pgTest("should list a sample with its rows", async ({ db }) => {
    // Arrange
    const created = await insertSample(
      db,
      mineralSample([row("9.E", MUSCOVITE, "major")]),
    );
    // Act
    const { data } = await listAsOwner(db, { page: 1, perPage: 10 });
    // Assert
    expect(data.map((sample) => sample.mineralClassifications)).toEqual([
      created.mineralClassifications,
    ]);
  });

  pgTest("should cascade the rows away with the sample", async ({ db }) => {
    // Arrange
    const created = await insertSample(db, mineralSample([row("9")]));
    // Act
    await db.deleteFrom("sample").where("id", "=", created.id).execute();
    // Assert
    expect(await storedRows(db, created.id)).toEqual([]);
  });
});
