import { describe, expect, it } from "vitest";

import { sampleAdditionalRoleSchema } from "./model.ts";

const USER_ID = "b7b3e4c2-1f9a-4a4f-9c3e-2d1f7a5c8e10";

describe("sampleAdditionalRoleSchema", () => {
  it.each([
    {
      case: "a row linked to an account alone",
      input: { role: "researcher", personUserId: USER_ID },
    },
    {
      case: "a row carrying a typed name and an ORCID",
      input: {
        role: "data_manager",
        personFirstname: "Marie",
        personLastname: "Curie",
        personOrcid: "0000-0002-1825-0097",
      },
    },
  ])("should accept $case", ({ input }) => {
    expect(sampleAdditionalRoleSchema.parse(input)).toEqual(input);
  });

  it("should accept a row carrying both its link and the name the account resolved to, since the read model resolves a link live", () => {
    const resolved = {
      role: "project_member",
      personUserId: USER_ID,
      personFirstname: "Marie",
      personLastname: "Curie",
    };

    expect(sampleAdditionalRoleSchema.parse(resolved)).toEqual(resolved);
  });
});
