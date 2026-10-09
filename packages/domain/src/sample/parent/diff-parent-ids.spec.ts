import { describe, expect, it } from "vitest";

import { diffParentIds } from "./diff-parent-ids.ts";

const STORED = {
  id: "11111111-1111-4111-8111-111111111111",
  igsn: "0123456789ABCDEFGHJKMNPQRS",
  name: "Basalt 42",
  material: null,
};
const NEW_PARENT_ID = "22222222-2222-4222-8222-222222222222";

describe("the parents a sample edit adds and removes", () => {
  it.each([
    {
      reason: "no submitted parents leaves them unchanged",
      submitted: undefined,
      expected: { added: [], removed: [] },
    },
    {
      reason: "a stored parent missing from the submission is removed",
      submitted: [],
      expected: { added: [], removed: [STORED] },
    },
    {
      reason: "a submitted parent not stored is added",
      submitted: [STORED.id, NEW_PARENT_ID],
      expected: { added: [NEW_PARENT_ID], removed: [] },
    },
    {
      reason: "the stored parents submitted again change nothing",
      submitted: [STORED.id],
      expected: { added: [], removed: [] },
    },
  ])("should report that $reason", ({ submitted, expected }) => {
    // Arrange / Act
    const diff = diffParentIds([STORED], submitted);
    // Assert
    expect(diff).toEqual(expected);
  });
});
