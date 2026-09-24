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
      });
    },
  );

  it("should refuse an unknown DATABASE_SSL mode rather than connect in clear", () => {
    expect(() => dbConfig({ ...ENV, DATABASE_SSL: "verify-ca" })).toThrow();
  });
});
