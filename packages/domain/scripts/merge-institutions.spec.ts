import type { Laboratory } from "../src/institutional-group/laboratory.ts";
import type { Osu } from "../src/institutional-group/osu.ts";

import { mergeInstitutions } from "./merge-institutions.ts";

const CNRS = "02feahw73";
const SORBONNE = "02en5vm52";

const laboratory = (overrides: Partial<Laboratory>): Laboratory => ({
  id: "199900001A",
  code: "UMR1",
  acronym: "L1",
  name: "Laboratoire 1",
  osu: "OSU1",
  organizationRors: [CNRS],
  ...overrides,
});

const osu = (overrides: Partial<Osu>): Osu => ({
  id: "199900009A",
  code: "OSU1",
  name: "OSU 1",
  organizationRors: [CNRS],
  ...overrides,
});

const exported = <T extends { id: string }>({ id: _id, ...entry }: T) => entry;

const NO_RNSR = { laboratory: () => undefined, osu: () => undefined };

describe("mergeInstitutions", () => {
  it("should keep a laboratory and an OSU absent from the export", () => {
    const kept = laboratory({ id: "199900002A", code: "UMR2", osu: "OSU2" });
    const keptOsu = osu({ id: "199900008A", code: "OSU2" });

    expect(
      mergeInstitutions(
        { laboratories: [laboratory({}), kept], osus: [osu({}), keptOsu] },
        {
          laboratories: [exported(laboratory({}))],
          osus: [exported(osu({}))],
        },
        NO_RNSR,
      ),
    ).toEqual({
      laboratories: [laboratory({}), kept],
      osus: [osu({}), keptOsu],
      notes: [
        "kept UMR2, absent from the export",
        "kept OSU2, absent from the export",
      ],
    });
  });

  it("should keep an organization link absent from the export", () => {
    const linked = { organizationRors: [CNRS, SORBONNE] };

    expect(
      mergeInstitutions(
        { laboratories: [laboratory(linked)], osus: [osu(linked)] },
        {
          laboratories: [exported(laboratory({}))],
          osus: [exported(osu({}))],
        },
        NO_RNSR,
      ),
    ).toEqual({
      laboratories: [laboratory(linked)],
      osus: [osu(linked)],
      notes: [
        `kept link UMR1 -> ${SORBONNE}, absent from the export`,
        `kept link OSU1 -> ${SORBONNE}, absent from the export`,
      ],
    });
  });

  it("should carry over the replacement of a laboratory still in the export", () => {
    const successor = laboratory({ id: "199900003A", code: "UMR3" });

    expect(
      mergeInstitutions(
        {
          laboratories: [laboratory({ replacedBy: successor.id }), successor],
          osus: [osu({})],
        },
        {
          laboratories: [
            exported(laboratory({ name: "Renamed" })),
            exported(successor),
          ],
          osus: [exported(osu({}))],
        },
        NO_RNSR,
      ).laboratories,
    ).toEqual([
      laboratory({ name: "Renamed", replacedBy: successor.id }),
      successor,
    ]);
  });

  it.each([
    {
      case: "under a former code alone",
      codes: ["UPS1"],
      expected: { name: "Old name" },
    },
    {
      case: "under both codes, the current one winning",
      codes: ["UPS1", "UAR1"],
      expected: {},
    },
  ])(
    "should merge a laboratory the export lists $case",
    ({ codes, expected }) => {
      const renumbered = laboratory({ code: "UAR1", formerCodes: ["UPS1"] });

      expect(
        mergeInstitutions(
          { laboratories: [renumbered], osus: [osu({})] },
          {
            laboratories: codes.map((code) =>
              exported(
                laboratory(
                  code === "UPS1" ? { code, name: "Old name" } : { code },
                ),
              ),
            ),
            osus: [exported(osu({}))],
          },
          NO_RNSR,
        ),
      ).toEqual({
        laboratories: [{ ...renumbered, ...expected }],
        osus: [osu({})],
        notes: [],
      });
    },
  );

  it("should give a new entry its RNSR id, or a local one when RNSR has none", () => {
    expect(
      mergeInstitutions(
        { laboratories: [], osus: [] },
        {
          laboratories: [exported(laboratory({}))],
          osus: [exported(osu({}))],
        },
        { laboratory: () => "202500001A", osu: () => undefined },
      ),
    ).toEqual({
      laboratories: [laboratory({ id: "202500001A" })],
      osus: [osu({ id: "local:OSU1" })],
      notes: [],
    });
  });

  it("should merge two new codes RNSR gives one id, the second as a former code", () => {
    expect(
      mergeInstitutions(
        { laboratories: [], osus: [] },
        {
          laboratories: [
            exported(laboratory({ organizationRors: [CNRS] })),
            exported(
              laboratory({ code: "UPS1", organizationRors: [SORBONNE] }),
            ),
          ],
          osus: [],
        },
        { laboratory: () => "202500001A", osu: () => undefined },
      ),
    ).toEqual({
      laboratories: [
        laboratory({
          id: "202500001A",
          formerCodes: ["UPS1"],
          organizationRors: [CNRS, SORBONNE],
        }),
      ],
      osus: [],
      notes: ["merged UPS1 into UMR1, same RNSR id"],
    });
  });

  it("should rename an entry the export lists under a new code of its RNSR id, keeping its history", () => {
    const listed = laboratory({
      code: "UPS1",
      formerCodes: ["UMS1"],
      organizationRors: [CNRS, SORBONNE],
      replacedBy: "202500002B",
    });

    expect(
      mergeInstitutions(
        { laboratories: [listed], osus: [] },
        {
          laboratories: [exported(laboratory({ code: "UAR1", name: "New" }))],
          osus: [],
        },
        { laboratory: () => "199900001A", osu: () => undefined },
      ),
    ).toEqual({
      laboratories: [
        {
          ...listed,
          code: "UAR1",
          name: "New",
          formerCodes: ["UMS1", "UPS1"],
          organizationRors: [CNRS, SORBONNE],
        },
      ],
      osus: [],
      notes: [
        `kept link UAR1 -> ${SORBONNE}, absent from the export`,
        "UPS1 is now UAR1, same RNSR id",
      ],
    });
  });

  it("should move a laboratory to the OSU the export gives it", () => {
    const moved = laboratory({ osu: "OSU2" });
    const osus = [osu({}), osu({ id: "199900008A", code: "OSU2" })];

    expect(
      mergeInstitutions(
        { laboratories: [laboratory({})], osus },
        { laboratories: [exported(moved)], osus: osus.map(exported) },
        NO_RNSR,
      ),
    ).toEqual({
      laboratories: [moved],
      osus,
      notes: ["laboratory UMR1 moved from OSU OSU1 to OSU2"],
    });
  });
});
