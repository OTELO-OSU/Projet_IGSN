import { describe, expect, it } from "vitest";

import { dbConfig } from "./db-config.ts";

const ENV = {
  DATABASE_HOST: "db.example.test",
  DATABASE_NAME: "igsn",
  DATABASE_USER: "igsn",
  DATABASE_PASSWORD: "secret",
};

describe("dbConfig", () => {
  it.each(["require", "verify-full"])(
    "should hand DATABASE_SSL=%s to the driver",
    (ssl) => {
      expect(dbConfig({ ...ENV, DATABASE_SSL: ssl })).toEqual({
        host: "db.example.test",
        port: 5432,
        database: "igsn",
        username: "igsn",
        password: "secret",
        ssl,
        connection: { jit: "off", random_page_cost: 1.1 },
      });
    },
  );

  it.each([
    [undefined, {}],
    ["", {}],
    ["2", { max: 2 }],
  ])(
    "should size the pool from DATABASE_POOL_MAX=%j, leaving max absent so postgres.js keeps its default",
    (poolMax, expected) => {
      expect(dbConfig({ ...ENV, DATABASE_POOL_MAX: poolMax })).toStrictEqual({
        host: "db.example.test",
        port: 5432,
        database: "igsn",
        username: "igsn",
        password: "secret",
        ssl: undefined,
        connection: { jit: "off", random_page_cost: 1.1 },
        ...expected,
      });
    },
  );

  it.each(["0", "abc"])(
    "should refuse DATABASE_POOL_MAX=%s rather than open no pool",
    (poolMax) => {
      expect(() => dbConfig({ ...ENV, DATABASE_POOL_MAX: poolMax })).toThrow();
    },
  );

  it("should refuse an unknown DATABASE_SSL mode rather than connect in clear", () => {
    expect(() => dbConfig({ ...ENV, DATABASE_SSL: "verify-ca" })).toThrow();
  });
});
