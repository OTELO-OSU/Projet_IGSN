import { describe, expect, it } from "vitest";

import { currentUserSchema } from "./current-user.ts";

describe("currentUserSchema", () => {
  it("should accept an identity carrying its moderation state", () => {
    expect(
      currentUserSchema.parse({
        sub: "f:saml-idp:jean.martin",
        username: "jean.martin",
        name: "Jean Martin",
        email: "jean.martin@univ-lorraine.fr",
        orcid: null,
        status: "accepted",
        superAdmin: false,
      }),
    ).toMatchObject({ status: "accepted", superAdmin: false });
  });

  it("should accept an identity without a profile", () => {
    expect(
      currentUserSchema.parse({
        sub: "f:saml-idp:jean.martin",
        orcid: null,
        status: "pending",
        superAdmin: false,
      }),
    ).toEqual({
      sub: "f:saml-idp:jean.martin",
      orcid: null,
      status: "pending",
      superAdmin: false,
      institutionalOrganization: null,
      institutionalOsu: null,
      institutionalLaboratory: null,
    });
  });

  it("should reject an identity without moderation state", () => {
    expect(
      currentUserSchema.safeParse({ sub: "someone", orcid: null }).success,
    ).toBe(false);
  });
});
