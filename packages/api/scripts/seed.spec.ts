import { describe, expect, it } from "vitest";

import { pgTest } from "../src/tests/pg-test.ts";
import {
  MOCK_RESEARCHERS,
  parseSeedSample,
  seed,
  SEED_SAMPLES,
} from "./seed.ts";

const draft = {
  id: "00000000-0000-7000-8000-00000000000f",
  name: "Drift probe",
  nature: "hand_sample",
  owner: "jean",
} as const;

describe("parseSeedSample", () => {
  // The fixture itself: any row drifting from its schema fails the suite,
  // not just the next seed run.
  it.each(SEED_SAMPLES.map((sample) => [sample.name, sample] as const))(
    "should accept the seed row %s",
    (_, sample) => {
      expect(() => parseSeedSample(sample)).not.toThrow();
    },
  );

  it("should reject a published row that is not publishable", () => {
    expect(() => parseSeedSample({ ...draft, published: true })).toThrow(
      /published schema/,
    );
  });

  it("should reject a draft row the create schema refuses", () => {
    // A synthetic material forbids a location (ADR 0014): only the create
    // schema knows, the persisted shape alone would let it through.
    expect(() =>
      parseSeedSample({
        ...draft,
        material: "synthetic_rock_mineral",
        location: {
          position: { type: "point", longitude: 2.35, latitude: 48.85 },
        },
      }),
    ).toThrow(/draft schema/);
  });

  it("should reject an out-of-vocabulary material", () => {
    expect(() =>
      parseSeedSample({ ...draft, material: "rock.made_up" }),
    ).toThrow();
  });

  it("should reject an unknown owner", () => {
    expect(() =>
      parseSeedSample({
        ...draft,
        // @ts-expect-error the invalid owner is the case under test
        owner: "nobody",
      }),
    ).toThrow();
  });
});

describe("SEED_SAMPLES ownership", () => {
  // The api refuses to publish for an unverified account, so a seeded published
  // row owned by one would be a state the app itself cannot produce.
  it("should let only verified accounts own a published row", () => {
    for (const sample of SEED_SAMPLES.filter((row) => row.published)) {
      const owner = MOCK_RESEARCHERS[sample.owner];
      expect(owner.superAdmin || owner.status === "accepted").toBe(true);
    }
  });

  it("should give the pending researcher drafts only", () => {
    const owned = SEED_SAMPLES.filter((sample) => sample.owner === "theo");
    expect(owned.length).toBeGreaterThan(0);
    expect(owned.every((sample) => !sample.published)).toBe(true);
  });

  it("should give the rejected researcher and the super admin nothing", () => {
    expect(
      SEED_SAMPLES.filter(
        (sample) => sample.owner === "chloe" || sample.owner === "nadia",
      ),
    ).toEqual([]);
  });
});

describe("seed", () => {
  pgTest(
    "should provision every identity's moderation state",
    async ({ db }) => {
      // Act
      await seed(db, SEED_SAMPLES);
      // Assert
      const rows = await db
        .selectFrom("user")
        .select(["email", "status", "super_admin"])
        .execute();
      const byEmail = new Map(rows.map((row) => [row.email, row]));
      expect(byEmail.get(MOCK_RESEARCHERS.marie.email)).toMatchObject({
        status: "accepted",
        super_admin: false,
      });
      expect(byEmail.get(MOCK_RESEARCHERS.nadia.email)).toMatchObject({
        status: "accepted",
        super_admin: true,
      });
      expect(byEmail.get(MOCK_RESEARCHERS.theo.email)).toMatchObject({
        status: "pending",
        super_admin: false,
      });
      expect(byEmail.get(MOCK_RESEARCHERS.chloe.email)).toMatchObject({
        status: "rejected",
        super_admin: false,
      });
    },
  );

  // Re-seeding an existing database enforces the fixture's roles, but leaves the
  // profile a real sign-in wrote.
  pgTest("should re-apply the roles of an existing row", async ({ db }) => {
    // Arrange
    await db
      .insertInto("user")
      .values({
        id: crypto.randomUUID(),
        email: MOCK_RESEARCHERS.nadia.email,
        name: "Signed-in name",
        firstname: "Signed-in firstname",
        status: "pending",
      })
      .execute();
    // Act
    await seed(db, SEED_SAMPLES);
    // Assert
    await expect(
      db
        .selectFrom("user")
        .select(["name", "firstname", "status", "super_admin"])
        .where("email", "=", MOCK_RESEARCHERS.nadia.email)
        .executeTakeFirstOrThrow(),
    ).resolves.toEqual({
      name: "Signed-in name",
      firstname: "Signed-in firstname",
      status: "accepted",
      super_admin: true,
    });
  });
});
