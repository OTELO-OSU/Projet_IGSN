import { describe, expect, it } from "vitest";

import { COLUMN_KINDS } from "./column-kind.ts";
import { DATA_SHEETS } from "./columns.ts";

describe("COLUMN_KINDS", () => {
  it("should resolve every template column path in createSampleSchema", () => {
    const unresolved = DATA_SHEETS.flatMap((sheet) => sheet.columns).flatMap(
      ({ path }) =>
        path === undefined || COLUMN_KINDS.has(path) ? [] : [path],
    );

    expect(unresolved).toEqual([]);
  });

  it("should type a column as its schema field and name the array it feeds", () => {
    expect({
      localId: COLUMN_KINDS.get("localId"),
      latitude: COLUMN_KINDS.get("location.position.latitude"),
      geologicalAge: COLUMN_KINDS.get("age.geologicalAgeMin"),
      oriented: COLUMN_KINDS.get("description.oriented"),
      identifier: COLUMN_KINDS.get("relations.identifier"),
      storageCondition: COLUMN_KINDS.get("condition.storageConditions"),
    }).toEqual({
      localId: { type: "string" },
      latitude: { type: "number" },
      geologicalAge: { type: "number" },
      oriented: { type: "boolean" },
      identifier: { type: "string", arrayPrefix: "relations" },
      storageCondition: {
        type: "string",
        arrayPrefix: "condition.storageConditions",
      },
    });
  });
});
