import { institutionUserParams } from "./institution-user-params.ts";

describe("institutionUserParams", () => {
  it.each([
    [
      "an organization",
      "organization:04vfs2w97",
      {
        institutionalOrganization: "04vfs2w97",
        institutionalOsu: undefined,
        institutionalLaboratory: undefined,
      },
    ],
    [
      "an OSU with its organization",
      "osu:014zrew76/OSUC",
      {
        institutionalOrganization: "014zrew76",
        institutionalOsu: "OSUC",
        institutionalLaboratory: undefined,
      },
    ],
    [
      "a laboratory",
      "laboratory:UMR7358",
      {
        institutionalOrganization: undefined,
        institutionalOsu: undefined,
        institutionalLaboratory: "UMR7358",
      },
    ],
  ])("should filter on %s", (_, institution, expected) => {
    expect(institutionUserParams(institution)).toEqual(expected);
  });
});
