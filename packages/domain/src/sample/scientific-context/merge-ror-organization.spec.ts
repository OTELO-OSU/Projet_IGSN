import {
  mergeRorOrganization,
  rorRecordSchema,
} from "./merge-ror-organization.ts";
import { type Organization } from "./organization.ts";

const curated: Organization = {
  ror: "0aaaaaa11",
  name: "Curated name",
  acronym: "CURATED ACRONYM",
};
const curatedWithoutAcronym: Organization = {
  ror: "0bbbbbb22",
  name: "Curated name",
  acronym: null,
};

describe("mergeRorOrganization", () => {
  it.each([
    {
      case: "take the ROR display name",
      current: curated,
      names: [{ value: "ROR name", types: ["ror_display", "label"] }],
      expected: {
        ror: "0aaaaaa11",
        name: "ROR name",
        acronym: "CURATED ACRONYM",
      },
    },
    {
      case: "keep the curated name when ROR lists no display name",
      current: curated,
      names: [{ value: "ROR label", types: ["label"] }],
      expected: {
        ror: "0aaaaaa11",
        name: "Curated name",
        acronym: "CURATED ACRONYM",
      },
    },
    {
      case: "keep the curated name when the ROR display name is empty",
      current: curated,
      names: [{ value: "", types: ["ror_display"] }],
      expected: {
        ror: "0aaaaaa11",
        name: "Curated name",
        acronym: "CURATED ACRONYM",
      },
    },
    {
      case: "keep the curated acronym when ROR lists none",
      current: curated,
      names: [{ value: "ROR name", types: ["ror_display", "alias"] }],
      expected: {
        ror: "0aaaaaa11",
        name: "ROR name",
        acronym: "CURATED ACRONYM",
      },
    },
    {
      case: "keep the curated acronym when ROR lists only an empty one",
      current: curated,
      names: [{ value: "", types: ["acronym"] }],
      expected: {
        ror: "0aaaaaa11",
        name: "Curated name",
        acronym: "CURATED ACRONYM",
      },
    },
    {
      case: "keep the curated acronym when ROR lists it among several",
      current: { ...curated, acronym: "ESA" },
      names: [
        { value: "ASE", types: ["acronym"] },
        { value: "ESA", types: ["acronym"] },
      ],
      expected: { ror: "0aaaaaa11", name: "Curated name", acronym: "ESA" },
    },
    {
      case: "take the first ROR acronym when none matches the curated one",
      current: curated,
      names: [{ value: "ROR ACRONYM", types: ["acronym"] }],
      expected: {
        ror: "0aaaaaa11",
        name: "Curated name",
        acronym: "ROR ACRONYM",
      },
    },
    {
      case: "fill a missing acronym from ROR",
      current: curatedWithoutAcronym,
      names: [{ value: "CYU", types: ["acronym"] }],
      expected: { ror: "0bbbbbb22", name: "Curated name", acronym: "CYU" },
    },
    {
      case: "keep both values when ROR lists no name at all",
      current: curated,
      names: [],
      expected: {
        ror: "0aaaaaa11",
        name: "Curated name",
        acronym: "CURATED ACRONYM",
      },
    },
  ])("should $case", ({ current, names, expected }) => {
    expect(mergeRorOrganization(current, { status: "active", names })).toEqual(
      expected,
    );
  });

  it("should ignore the ROR status", () => {
    expect(
      mergeRorOrganization(curated, {
        status: "inactive",
        names: [{ value: "ROR name", types: ["ror_display"] }],
      }),
    ).toEqual({
      ror: "0aaaaaa11",
      name: "ROR name",
      acronym: "CURATED ACRONYM",
    });
  });
});

describe("rorRecordSchema", () => {
  it("should accept a ROR payload and keep only status and names", () => {
    expect(
      rorRecordSchema.parse({
        id: "https://ror.org/0aaaaaa11",
        status: "active",
        names: [{ value: "ROR ACRONYM", lang: null, types: ["acronym"] }],
      }),
    ).toEqual({
      status: "active",
      names: [{ value: "ROR ACRONYM", types: ["acronym"] }],
    });
  });

  it.each([
    { case: "an empty payload", payload: {} },
    { case: "a missing names array", payload: { status: "active" } },
    { case: "a missing status", payload: { names: [] } },
    { case: "a non-string status", payload: { status: 1, names: [] } },
    {
      case: "a non-array names",
      payload: { status: "active", names: "ROR ACRONYM" },
    },
    {
      case: "a name without types",
      payload: { status: "active", names: [{ value: "ROR ACRONYM" }] },
    },
    {
      case: "a name with non-string types",
      payload: {
        status: "active",
        names: [{ value: "ROR ACRONYM", types: [1] }],
      },
    },
  ])("should reject $case", ({ payload }) => {
    expect(rorRecordSchema.safeParse(payload)).toMatchObject({
      success: false,
    });
  });
});
