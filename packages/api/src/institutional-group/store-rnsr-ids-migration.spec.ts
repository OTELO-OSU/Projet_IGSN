import { describe, expect } from "vitest";

import { up } from "../../migrations/20261013133133-store-rnsr-ids.ts";
import { insertSample } from "../sample/service/insert-sample.ts";
import { insertServiceAccount } from "../tests/insert-service-account.ts";
import { insertUser } from "../tests/insert-user.ts";
import { pgTest } from "../tests/pg-test.ts";
import { draft } from "../tests/sample-fixtures.ts";

const UAR2074_ID = "199921733G";
const OVSQ_ID = "201020686W";
const UMR8109_ID = "200212766X";

describe("store-rnsr-ids migration", () => {
  pgTest(
    "should rewrite every stored code into its RNSR id, keeping one managed row per id and an unknown value as is",
    async ({ db }) => {
      // Arrange
      const user = await insertUser(db, "member-5c1@univ-lorraine.fr");
      await db
        .updateTable("user")
        .set({ institutional_osu: "OVSQ", institutional_laboratory: "UPS2074" })
        .where("id", "=", user.id)
        .execute();
      await db
        .insertInto("user_managed_institutional_group")
        .values(
          ["UPS2074", "UAR2074", "UNKNOWN42"].map((code) => ({
            user_id: user.id,
            kind: "laboratory" as const,
            code,
          })),
        )
        .execute();
      const account = await insertServiceAccount(db, "Sensor fleet", user.id);
      await db
        .insertInto("service_account_managed_institutional_group")
        .values([
          { service_account_id: account.id, kind: "osu", code: "OVSQ" },
          {
            service_account_id: account.id,
            kind: "laboratory",
            code: "UPS2074",
          },
          {
            service_account_id: account.id,
            kind: "laboratory",
            code: "UAR2074",
          },
        ])
        .execute();
      const sample = await insertSample(db, draft);
      await db
        .updateTable("sample")
        .set({
          institutional_osu: "OVSQ",
          institutional_laboratory: "UMR8109",
          rep_current_archive_osu: "OVSQ",
          rep_current_archive_laboratory: "UPS2074",
        })
        .where("id", "=", sample.id)
        .execute();
      // Act
      await up(db);
      // Assert
      expect({
        user: await db
          .selectFrom("user")
          .select(["institutional_osu", "institutional_laboratory"])
          .where("id", "=", user.id)
          .executeTakeFirstOrThrow(),
        managed: await db
          .selectFrom("user_managed_institutional_group")
          .select("code")
          .where("user_id", "=", user.id)
          .orderBy("code")
          .execute(),
        serviceAccountManaged: await db
          .selectFrom("service_account_managed_institutional_group")
          .select(["kind", "code"])
          .where("service_account_id", "=", account.id)
          .orderBy("kind")
          .execute(),
        sample: await db
          .selectFrom("sample")
          .select([
            "institutional_osu",
            "institutional_laboratory",
            "rep_current_archive_osu",
            "rep_current_archive_laboratory",
          ])
          .where("id", "=", sample.id)
          .executeTakeFirstOrThrow(),
      }).toEqual({
        user: {
          institutional_osu: OVSQ_ID,
          institutional_laboratory: UAR2074_ID,
        },
        managed: [{ code: UAR2074_ID }, { code: "UNKNOWN42" }],
        serviceAccountManaged: [
          { kind: "laboratory", code: UAR2074_ID },
          { kind: "osu", code: OVSQ_ID },
        ],
        sample: {
          institutional_osu: OVSQ_ID,
          institutional_laboratory: UMR8109_ID,
          rep_current_archive_osu: OVSQ_ID,
          rep_current_archive_laboratory: UAR2074_ID,
        },
      });
    },
  );
});
