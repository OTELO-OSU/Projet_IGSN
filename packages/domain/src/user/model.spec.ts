import { describe, expect, it } from "vitest";

import { userSchema } from "./model.ts";

const user = {
  id: "01890a5d-ac96-774b-bcce-b302099a8057",
  email: "jean.martin@univ-lorraine.fr",
  name: "Martin",
  firstname: "Jean",
  orcid: null,
  status: "pending",
  superAdmin: false,
  institutionalOrganization: null,
  institutionalOsu: null,
  institutionalLaboratory: null,
};

describe("userSchema", () => {
  it.each(["curie(at)univ-lorraine.fr", "inconnu", ""])(
    "should accept the legacy-imported address %s",
    (email) => {
      expect(userSchema.safeParse({ ...user, email }).success).toBe(true);
    },
  );

  it("should accept a user with a known status", () => {
    expect(userSchema.parse(user)).toEqual(user);
  });

  it("should reject a status outside the vocabulary", () => {
    expect(userSchema.safeParse({ ...user, status: "banned" }).success).toBe(
      false,
    );
  });

  it("should reject a missing super admin flag", () => {
    expect(
      userSchema.safeParse({ ...user, superAdmin: undefined }).success,
    ).toBe(false);
  });
});
