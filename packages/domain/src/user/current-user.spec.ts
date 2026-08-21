import { describe, expect, it } from "vitest";

import { currentUserSchema } from "./current-user.ts";

describe("currentUserSchema", () => {
  it("should accept an identity without a profile", () => {
    expect(
      currentUserSchema.parse({
        sub: "f:saml-idp:jean.martin",
        orcid: null,
        status: "pending",
        superAdmin: false,
        managedLaboratories: [],
        managedManualGroups: [],
      }),
    ).toEqual({
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
