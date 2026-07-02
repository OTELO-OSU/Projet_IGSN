import { describe, expect } from "vitest";

import { pgTest } from "./tests/pg-test.ts";
import { withTransaction } from "./transaction.ts";

describe("withTransaction", () => {
  // The pgTest fixture `db` is itself a transaction, so this covers the reuse
  // branch our repositories rely on: no nested transaction is opened.
  pgTest("should reuse the transaction it is already in", async ({ db }) => {
    // Act
    const received = await withTransaction(db, async (trx) => trx);
    // Assert
    expect(received).toBe(db);
    expect(received.isTransaction).toBe(true);
  });

  pgTest("should run the callback and return its result", async ({ db }) => {
    // Act
    const result = await withTransaction(db, async () => 42);
    // Assert
    expect(result).toBe(42);
  });

  pgTest("should propagate a callback error", async ({ db }) => {
    // Act / Assert
    await expect(
      withTransaction(db, async () => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
  });
});
