import { describe, expect, it } from "vitest";

import { keepContactLinks } from "./contact-link.ts";

const MARIE_ID = "cccccccc-3333-4333-8333-cccccccccccc";
const ADA_ID = "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa";
const EMMY_ID = "eeeeeeee-2222-4222-8222-eeeeeeeeeeee";

const ADA = {
  role: "researcher",
  personFirstname: "Ada",
  personLastname: "Lovelace",
  personOrcid: null,
};

const GRACE = {
  role: "project_member",
  personFirstname: "Grace",
  personLastname: "Hopper",
  personOrcid: null,
};

const EMMY = {
  role: "researcher",
  personFirstname: "Emmy",
  personLastname: "Noether",
  personOrcid: null,
};

const NO_NAME = {
  personFirstname: null,
  personLastname: null,
  personOrcid: null,
};

const CURRENT = {
  scientificContext: {
    collectorUserId: MARIE_ID,
    collectorFirstname: "Marie",
    collectorLastname: "Curie",
    collectorOrcid: null,
    additionalRoles: [
      { ...ADA, personUserId: ADA_ID },
      { ...GRACE, personUserId: null },
      { ...EMMY, personUserId: EMMY_ID },
    ],
  },
};

const submitted = (additionalRoles: object[]) => ({
  scientificContext: {
    collectorFirstname: "Marie",
    collectorLastname: "Curie",
    collectorOrcid: null,
    additionalRoles,
  },
});

const rolesOf = (incoming: ReturnType<typeof submitted>) =>
  keepContactLinks(incoming, CURRENT).scientificContext.additionalRoles;

describe("the account links of a submitted sample", () => {
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

  it.each([
    [
      "the name the stored account resolved to",
      { collectorFirstname: "Marie", collectorLastname: "Curie" },
      {
        collectorUserId: MARIE_ID,
        collectorFirstname: null,
        collectorLastname: null,
        collectorOrcid: null,
      },
    ],
    [
      "another name",
      { collectorFirstname: "Irene", collectorLastname: "Curie" },
      {
        collectorFirstname: "Irene",
        collectorLastname: "Curie",
        collectorOrcid: null,
      },
    ],
  ])(
    "should keep the collector link only when the submitted name is %s",
    (_case, collector, expected) => {
      expect(
        keepContactLinks(
          { ...submitted([]).scientificContext, ...collector },
          CURRENT.scientificContext,
        ),
      ).toEqual({ ...expected, additionalRoles: [] });
    },
  );
});
