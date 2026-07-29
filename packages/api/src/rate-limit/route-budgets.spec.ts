import type { Kysely } from "kysely";

import { describe, expect, it } from "vitest";

import type { DB } from "../db.ts";

import { createApp } from "../app.ts";
import { RATE_LIMIT_ROUTES } from "./route-budgets.ts";

describe("RATE_LIMIT_ROUTES", () => {
  it("should hold one row per api route, the healthcheck aside", () => {
    // Route registration issues no query, so no database is needed here.
    // `.use("*")` middlewares register as ALL; each validator registers as a
    // separate handler on the same path, hence the Set.
    const registered = new Set(
      createApp({} as Kysely<DB>)
        .routes.filter(({ method }) => method !== "ALL")
        .map(({ method, path }) => `${method} ${path}`),
    );

    expect([...registered].sort()).toEqual(
      [
        "GET /",
        ...RATE_LIMIT_ROUTES.map(({ method, path }) => `${method} ${path}`),
      ].sort(),
    );
  });

  // A write costs disk (a 100 MB attachment lands on the same volume as the
  // database), so it must never be as cheap as a read. Pinned per key so the
  // budgets cannot be widened back without saying so.
  it.each([
    ["ADMIN_SAMPLES_CREATE", { points: 30, duration: 60 }],
    ["ADMIN_SAMPLES_UPDATE", { points: 30, duration: 60 }],
    ["ADMIN_SAMPLES_PUBLISH", { points: 30, duration: 60 }],
    ["ADMIN_ATTACHMENT_CREATE", { points: 20, duration: 60 }],
  ])("should cap %s at a stricter budget", (key, budget) => {
    expect(
      RATE_LIMIT_ROUTES.filter((route) => route.key === key).map(
        ({ points, duration }) => ({ points, duration }),
      ),
    ).toEqual([budget]);
  });

  // Supporting check only: the per-key cases above are what pin the numbers.
  it("should keep admin non-GET budgets under the GET ones, vacuously if either group is empty", () => {
    const admin = RATE_LIMIT_ROUTES.filter(({ scope }) => scope === "user");
    const points = (isRead: boolean) =>
      admin
        .filter(({ method }) => (method === "GET") === isRead)
        .map(({ points }) => points);

    expect(Math.max(...points(false))).toBeLessThan(Math.min(...points(true)));
  });
});
