import { describe, expect, it } from "vitest";

import { keepContactLinks } from "./contact-link.ts";

const MARIE_ID = "cccccccc-3333-4333-8333-cccccccccccc";
const ADA_ID = "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa";
const EMMY_ID = "eeeeeeee-2222-4222-8222-eeeeeeeeeeee";

const ADA = {
  role: "researcher",
  personFirstname: "Ada",
  personLastname: "Lovelace",
};

const GRACE = {
  role: "project_member",
  personFirstname: "Grace",
  personLastname: "Hopper",
};

const EMMY = {
  role: "researcher",
  personFirstname: "Emmy",
  personLastname: "Noether",
};

const NO_NAME = {
  personFirstname: null,
  personLastname: null,
};

const CURRENT = {
  scientificContext: {
    collectorUserId: MARIE_ID,
    collectorFirstname: "Marie",
    collectorLastname: "Curie",
    collectorOrcid: "0000-0002-1825-0097",
    additionalRoles: [
      { ...ADA, personUserId: ADA_ID, personOrcid: "0000-0001-5109-3700" },
      { ...GRACE, personUserId: null, personOrcid: null },
      { ...EMMY, personUserId: EMMY_ID, personOrcid: null },
    ],
  },
};

const submitted = (additionalRoles: object[]) => ({
  scientificContext: {
    collectorFirstname: "Marie",
    collectorLastname: "Curie",
    additionalRoles,
  },
});

const rolesOf = (incoming: ReturnType<typeof submitted>) =>
  keepContactLinks(incoming, CURRENT).scientificContext.additionalRoles;

describe("the account links of a submitted sample", () => {
  it("should keep the link of a person the payload names without an ORCID key, since a write payload carries no ORCID", () => {
    expect(
      keepContactLinks(
        submitted([]).scientificContext,
        CURRENT.scientificContext,
      ),
    ).toEqual({
      collectorUserId: MARIE_ID,
      collectorFirstname: null,
      collectorLastname: null,
      additionalRoles: [],
    });
  });

  it("should follow each person of a reordered additional role list", () => {
    expect(rolesOf(submitted([EMMY, GRACE, ADA]))).toEqual([
      { role: "researcher", personUserId: EMMY_ID, ...NO_NAME },
      GRACE,
      { role: "researcher", personUserId: ADA_ID, ...NO_NAME },
    ]);
  });

  it("should follow the person a shortened additional role list keeps", () => {
    expect(rolesOf(submitted([EMMY]))).toEqual([
      { role: "researcher", personUserId: EMMY_ID, ...NO_NAME },
    ]);
  });

  it.each([
    ["a name no stored row carries", { ...EMMY, personLastname: "Curie" }],
    ["a stored person under another role", { ...ADA, role: "project_manager" }],
  ])("should keep %s as a typed name linked to no account", (_case, person) => {
    expect(rolesOf(submitted([person]))).toEqual([person]);
  });

  it("should restore a stored link once, so a repeated person links once", () => {
    expect(rolesOf(submitted([EMMY, EMMY]))).toEqual([
      { role: "researcher", personUserId: EMMY_ID, ...NO_NAME },
      EMMY,
    ]);
  });

  it("should replace the link with the typed name when the submitted name is another one", () => {
    expect(
      keepContactLinks(
        {
          ...submitted([]).scientificContext,
          collectorFirstname: "Irene",
          collectorLastname: "Curie",
        },
        CURRENT.scientificContext,
      ),
    ).toEqual({
      collectorFirstname: "Irene",
      collectorLastname: "Curie",
      additionalRoles: [],
    });
  });
});
