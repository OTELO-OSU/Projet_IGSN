import { addContributorBodySchema } from "./user-sample-validator.ts";

describe("addContributorBodySchema", () => {
  it("should accept a user id", () => {
    const result = addContributorBodySchema.safeParse({
      userId: "01890a5d-ac96-774b-bcce-b302099a8057",
    });

    expect(result).toMatchObject({
      success: true,
      data: { userId: "01890a5d-ac96-774b-bcce-b302099a8057" },
    });
  });

  it.each([
    {},
    { userId: "not-a-uuid" },
    { userId: null },
    {
      userId: "01890a5d-ac96-774b-bcce-b302099a8057",
      role: "owner",
    },
  ])("should reject %s", (input) => {
    expect(addContributorBodySchema.safeParse(input).success).toBe(false);
  });
});
