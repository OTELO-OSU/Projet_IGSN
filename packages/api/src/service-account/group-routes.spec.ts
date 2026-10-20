import type { Kysely } from "kysely";

import { filterOrganizationsWithLaboratory } from "@projet-igsn/domain/institutional-group/filter-organizations-with-laboratory";
import { LABORATORIES } from "@projet-igsn/domain/institutional-group/laboratory";
import { OSUS } from "@projet-igsn/domain/institutional-group/osu";
import { describe, expect, it } from "vitest";

import type { DB } from "../db.ts";

import { createApp } from "../app.ts";
import { insertSample } from "../sample/service/insert-sample.ts";
import { publishSample } from "../sample/service/publish-sample.ts";
import { pgTest } from "../tests/pg-test.ts";

const PUBLISHED = "01890a5d-ac96-774b-8634-b302099a9101";
const DRAFT_ONLY = "01890a5d-ac96-774b-8634-b302099a9102";
const EMPTY = "01890a5d-ac96-774b-8634-b302099a9103";

describe("GET /service catalog group lists", () => {
  const { app } = createApp({} as Kysely<DB>);

  it.each([
    {
      path: "/service/organizations",
      data: filterOrganizationsWithLaboratory().map(({ ror, name }) => ({
        ror,
        name,
      })),
    },
    {
      path: "/service/osus",
      data: OSUS.map(({ code, name }) => ({ code, name })),
    },
    {
      path: "/service/laboratories",
      data: LABORATORIES.map(({ code, name }) => ({ code, name })),
    },
  ])("should list only the filter values of $path", async ({ path, data }) => {
    const res = await app.request(path);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ data });
  });
});

describe("GET /service/manual-groups", () => {
  pgTest(
    "should list only the groups holding a published sample",
    async ({ db }) => {
      // Arrange
      await db
        .insertInto("manual_group")
        .values([
          { id: PUBLISHED, name: "ANR CritMet 634" },
          { id: DRAFT_ONLY, name: "ProfilLoire 2024" },
          { id: EMPTY, name: "OZCAR-RI 634" },
        ])
        .execute();
      const published = await insertSample(db, {
        name: "Published sample",
        nature: "powder",
        type: null,
        collectionMethod: null,
        manualGroupIds: [PUBLISHED],
      });
      await publishSample(db, published.id);
      await insertSample(db, {
        name: "Draft sample",
        nature: "powder",
        type: null,
        collectionMethod: null,
        manualGroupIds: [DRAFT_ONLY],
      });
      // Act
      const res = await createApp(db).app.request("/service/manual-groups");
      // Assert
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({
        data: [{ id: PUBLISHED, name: "ANR CritMet 634" }],
      });
    },
  );
});
