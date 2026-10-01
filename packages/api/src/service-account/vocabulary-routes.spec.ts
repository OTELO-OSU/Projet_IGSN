import type { Kysely } from "kysely";

import { coreVocabularies } from "@projet-igsn/domain/sample/core/core-vocabularies";
import { describe, expect, it } from "vitest";

import type { DB } from "../db.ts";

import { createApp } from "../app.ts";
import { labels } from "../sample/import-template/labels.ts";

const { app } = createApp({} as Kysely<DB>);

const EXISTENCE_STATUS = [
  { id: "exists", label: "Exists" },
  { id: "partiallyConsumed", label: "Partially consumed" },
  { id: "consumed", label: "Consumed" },
  { id: "destroyed", label: "Destroyed" },
  { id: "lost", label: "Lost" },
  { id: "unknown", label: "Unknown" },
];

describe("GET /service/vocabularies", () => {
  it("should list every vocabulary a Core record carries", async () => {
    const res = await app.request("/service/vocabularies");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      data: coreVocabularies(labels, "en").map(({ id, schemeName }) => ({
        id,
        schemeName,
      })),
    });
  });
});

describe("GET /service/vocabularies/{id}", () => {
  it("should answer every value in its Core spelling with its English label", async () => {
    const res = await app.request("/service/vocabularies/existenceStatus");

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Language")).toBe("en");
    expect(res.headers.get("Vary")?.split(", ")).toContain("Accept-Language");
    expect(await res.json()).toEqual({ data: EXISTENCE_STATUS });
  });

  it("should fall back to English for a language with no catalog", async () => {
    const res = await app.request("/service/vocabularies/existenceStatus", {
      headers: { "Accept-Language": "fr" },
    });

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Language")).toBe("en");
    expect(await res.json()).toEqual({ data: EXISTENCE_STATUS });
  });

  it.each(["unknown", "existence_status", "ExistenceStatus"])(
    "should answer 404 for the unknown vocabulary %s",
    async (id) => {
      const res = await app.request(`/service/vocabularies/${id}`);

      expect(res.status).toBe(404);
      expect(await res.json()).toEqual({ error: "Not found" });
    },
  );
});
