import { describe, expect, it } from "vitest";

import { currentUserSchema } from "./current-user.ts";

describe("currentUserSchema", () => {
  it("should accept an identity without a profile", () => {
    expect(
      currentUserSchema.parse({
        id: "5c2f8b31-6a4d-4f92-8e10-3d7c9a5b1e04",
        sub: "f:saml-idp:jean.martin",
        orcid: null,
        status: "pending",
        superAdmin: false,
        managedLaboratories: [],
        managedManualGroups: [],
      }),
    ).toEqual({
      id: "5c2f8b31-6a4d-4f92-8e10-3d7c9a5b1e04",
      sub: "f:saml-idp:jean.martin",
      orcid: null,
      status: "pending",
      superAdmin: false,
      managedLaboratories: [],
      managedManualGroups: [],
      institutionalOrganization: null,
      institutionalOsu: null,
      institutionalLaboratory: null,
    });
  });
});
