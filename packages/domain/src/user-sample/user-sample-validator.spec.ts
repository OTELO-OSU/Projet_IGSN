import {
  addContributorBodySchema,
  sampleCollaboratorSchema,
} from "./user-sample-validator.ts";

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

describe("sampleCollaboratorSchema", () => {
  const identity = {
    id: "01890a5d-ac96-774b-bcce-b302099a8057",
    email: "marie.curie@univ-lorraine.fr",
    name: "Curie",
    firstname: "Marie",
    orcid: null,
  };

  it.each(["owner", "contributor"])(
    "should accept an identity with the %s role",
    (role) => {
      const result = sampleCollaboratorSchema.safeParse({ ...identity, role });

      expect(result).toMatchObject({
        success: true,
        data: { ...identity, role },
      });
    },
  );

  it.each([identity, { ...identity, role: "editor" }, { role: "owner" }])(
    "should reject %s",
    (input) => {
      expect(sampleCollaboratorSchema.safeParse(input).success).toBe(false);
    },
  );
});
