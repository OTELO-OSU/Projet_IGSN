import { addCollaboratorBodySchema } from "./user-sample-validator.ts";

describe("addCollaboratorBodySchema", () => {
  it("should reject the owner role", () => {
    const result = addCollaboratorBodySchema.safeParse({
      userId: "01890a5d-ac96-774b-bcce-b302099a8057",
      role: "owner",
    });

    expect(result.success).toBe(false);
  });
});
