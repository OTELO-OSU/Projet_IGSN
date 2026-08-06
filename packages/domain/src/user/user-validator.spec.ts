import { describe, expect, it } from "vitest";

import { DEFAULT_PAGE_SIZE } from "../sample/sample-validator.ts";
import {
  listUsersQuerySchema,
  setUserStatusBodySchema,
} from "./user-validator.ts";

describe("listUsersQuerySchema", () => {
  it("should default an empty query", () => {
    expect(listUsersQuerySchema.parse({})).toEqual({
      page: 1,
      perPage: DEFAULT_PAGE_SIZE,
      status: undefined,
    });
  });

  it("should coerce a page and keep a known status filter", () => {
    expect(
      listUsersQuerySchema.parse({ page: "3", status: "pending" }),
    ).toEqual({ page: 3, perPage: DEFAULT_PAGE_SIZE, status: "pending" });
  });

  it("should degrade an unknown status or page size to the default", () => {
    expect(
      listUsersQuerySchema.parse({ page: "0", perPage: "7", status: "banned" }),
    ).toEqual({ page: 1, perPage: DEFAULT_PAGE_SIZE, status: undefined });
  });
});

describe("setUserStatusBodySchema", () => {
  it("should accept a decision", () => {
    expect(setUserStatusBodySchema.parse({ status: "accepted" })).toEqual({
      status: "accepted",
    });
  });

  it("should refuse an unknown field", () => {
    expect(
      setUserStatusBodySchema.safeParse({
        status: "accepted",
        superAdmin: true,
      }).success,
    ).toBe(false);
  });

  it("should refuse pending and anything outside the vocabulary", () => {
    expect(
      setUserStatusBodySchema.safeParse({ status: "pending" }).success,
    ).toBe(false);
    expect(setUserStatusBodySchema.safeParse({ status: "nope" }).success).toBe(
      false,
    );
  });
});
