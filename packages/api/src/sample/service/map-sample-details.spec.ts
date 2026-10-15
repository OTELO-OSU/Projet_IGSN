import type { Location } from "@projet-igsn/domain/sample/location/model";
import type { CreateSample, Sample } from "@projet-igsn/domain/sample/sample";

import { describe, expect } from "vitest";

import type { DB } from "../../db.ts";
import type { Transactional } from "../../transaction.ts";

import { pgTest } from "../../tests/pg-test.ts";
import { insertSample } from "./insert-sample.ts";
import { mapPublishedDetails } from "./map-sample-details.ts";
import { publishSample } from "./publish-sample.ts";

type Position = NonNullable<Location["position"]>;

const AREA: Position = {
  type: "area",
  westLongitude: 170,
  southLatitude: 0,
  eastLongitude: -170,
  northLatitude: 20,
};

const LINE: Position = {
  type: "line",
  startLongitude: 0,
  startLatitude: 10,
  endLongitude: 20,
  endLatitude: 10,
};

async function insertPublished(
  db: Transactional<DB>,
  name: string,
  extra: Partial<CreateSample> = {},
): Promise<Sample> {
  const { id } = await insertSample(db, {
    name,
    nature: "powder",
    type: null,
    collectionMethod: null,
    material: "rock_and_sediment.sediment",
    location: { position: { type: "point", longitude: 5, latitude: 45 } },
    ...extra,
  });
  const published = await publishSample(db, id);
  if (!published) throw new Error(`${name} vanished`);
  return published;
}

describe("mapPublishedDetails", () => {
  pgTest(
    "should describe the published samples asked for, sub-samples included, nothing else",
    async ({ db }) => {
      // Arrange
      const area = await insertPublished(db, "Area", {
        location: { position: AREA },
      });
      const line = await insertPublished(db, "Line", {
        location: { position: LINE },
      });
      const child = await insertPublished(db, "Sub-sample", {
        parentIds: [area.id],
      });
      const hidden = [];
      for (const status of ["draft", "withdrawn", "embargo"] as const) {
        const sample = await insertPublished(db, status);
        await db
          .updateTable("sample")
          .set({ status })
          .where("id", "=", sample.id)
          .execute();
        hidden.push(sample.internalNumber!);
      }
      // Act
      const { data } = await mapPublishedDetails(db, [
        area.internalNumber!,
        line.internalNumber!,
        child.internalNumber!,
        ...hidden,
        999_999,
      ]);
      // Assert
      expect(
        data.toSorted(
          (left, right) => left.internalNumber - right.internalNumber,
        ),
      ).toEqual([
        {
          internalNumber: area.internalNumber,
          igsn: area.igsn,
          name: "Area",
          position: AREA,
        },
        {
          internalNumber: line.internalNumber,
          igsn: line.igsn,
          name: "Line",
          position: LINE,
        },
        {
          internalNumber: child.internalNumber,
          igsn: child.igsn,
          name: "Sub-sample",
          position: AREA,
        },
      ]);
    },
  );
});
