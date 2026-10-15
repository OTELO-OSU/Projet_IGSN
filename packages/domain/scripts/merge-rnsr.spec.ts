import type { Laboratory } from "../src/institutional-group/laboratory.ts";
import type { Osu } from "../src/institutional-group/osu.ts";
import type { RnsrRecord } from "./merge-rnsr-laboratory.ts";

import { mergeRnsr } from "./merge-rnsr.ts";

const CNRS = "02feahw73";
const SORBONNE = "02en5vm52";

const laboratory = (overrides: Partial<Laboratory> = {}): Laboratory => ({
  id: "199900001A",
  code: "UMR1",
  acronym: "L1",
  name: "Laboratoire un",
  osu: "OSU1",
  organizationRors: [CNRS],
  ...overrides,
});

const osu = (overrides: Partial<Osu> = {}): Osu => ({
  id: "199900009A",
  code: "OSU1",
  name: "Observatoire un",
  organizationRors: [CNRS],
  ...overrides,
});

const record = (overrides: Partial<RnsrRecord> = {}): RnsrRecord => ({
  numero_national_de_structure: "199900001A",
  libelle: "Laboratoire un",
  sigle: "L1",
  label_numero: ["UMR 1"],
  numero_de_structure_historique: null,
  ...overrides,
});

const successor = record({
  numero_national_de_structure: "202500002B",
  libelle: "UMR 2 - Laboratoire deux",
  sigle: "L2",
  label_numero: ["UMR 2"],
  numero_de_structure_historique: ["199900001A"],
});

describe("mergeRnsr", () => {
  it("should take the RNSR name of the laboratory holding its id", () => {
    expect(
      mergeRnsr({ laboratories: [laboratory()], osus: [] }, [
        record({ libelle: "Laboratoire un renommé" }),
      ]).laboratories,
    ).toEqual([laboratory({ name: "Laboratoire un renommé" })]);
  });

  it.each([
    {
      case: "move a code RNSR no longer lists to the same number's new code",
      code: "UPS1",
      expected: laboratory({ code: "UAR1", formerCodes: ["UPS1"] }),
      notes: ["laboratory UPS1 is now UAR1"],
    },
    {
      case: "keep a code RNSR lists under its former type",
      code: "UAR1",
      labels: ["UMS 1"],
      expected: laboratory({ code: "UAR1" }),
      notes: [],
    },
    {
      case: "only report a code RNSR lists under another number",
      code: "UMR7",
      expected: laboratory({ code: "UMR7" }),
      notes: ["laboratory UMR7 is listed as UAR1 in RNSR"],
    },
  ])("should $case", ({ code, labels = ["UAR 1"], expected, notes }) => {
    expect(
      mergeRnsr({ laboratories: [laboratory({ code })], osus: [] }, [
        record({ label_numero: labels }),
      ]),
    ).toEqual({ laboratories: [expected], osus: [], notes });
  });

  it("should keep a code whose requalified code another laboratory holds", () => {
    const holder = laboratory({
      id: "199900002A",
      code: "UMR2",
      formerCodes: ["UAR1"],
    });

    expect(
      mergeRnsr(
        { laboratories: [laboratory({ code: "UPS1" }), holder], osus: [] },
        [
          record({ label_numero: ["UAR 1"] }),
          record({
            numero_national_de_structure: "199900002A",
            label_numero: ["UMR 2"],
          }),
        ],
      ),
    ).toEqual({
      laboratories: [laboratory({ code: "UPS1" }), holder],
      osus: [],
      notes: ["laboratory UPS1 could become UAR1, a code already listed"],
    });
  });

  it("should not list a laboratory's current code among its former codes", () => {
    expect(
      mergeRnsr(
        {
          laboratories: [laboratory({ code: "UMR1", formerCodes: ["UAR1"] })],
          osus: [],
        },
        [record({ label_numero: ["UAR 1"] })],
      ).laboratories,
    ).toEqual([laboratory({ code: "UAR1", formerCodes: ["UMR1"] })]);
  });

  it("should add the successor RNSR records for an inactive laboratory and replace it", () => {
    const old = laboratory({ organizationRors: [CNRS, SORBONNE] });

    expect(mergeRnsr({ laboratories: [old], osus: [] }, [successor])).toEqual({
      laboratories: [
        { ...old, replacedBy: "202500002B" },
        {
          id: "202500002B",
          code: "UMR2",
          acronym: "L2",
          name: "Laboratoire deux",
          osu: "OSU1",
          organizationRors: [CNRS, SORBONNE],
        },
      ],
      osus: [],
      notes: ["laboratory UMR1 is succeeded by UMR2"],
    });
  });

  it("should give a successor the catalog's code convention", () => {
    const merged = mergeRnsr({ laboratories: [laboratory()], osus: [] }, [
      { ...successor, sigle: null, label_numero: ["UMS 2"] },
    ]);

    expect(merged.laboratories[1]).toMatchObject({
      code: "UAR2",
      acronym: "UAR2",
    });
  });

  it("should add one successor for two merged laboratories, with both organizations", () => {
    const other = laboratory({
      id: "199900002A",
      code: "UMR3",
      organizationRors: [SORBONNE],
    });
    const merger = {
      ...successor,
      numero_de_structure_historique: ["199900001A", "199900002A"],
    };

    expect(
      mergeRnsr({ laboratories: [laboratory(), other], osus: [] }, [merger]),
    ).toEqual({
      laboratories: [
        laboratory({ replacedBy: "202500002B" }),
        {
          id: "202500002B",
          code: "UMR2",
          acronym: "L2",
          name: "Laboratoire deux",
          osu: "OSU1",
          organizationRors: [CNRS, SORBONNE],
        },
        { ...other, replacedBy: "202500002B" },
      ],
      osus: [],
      notes: [
        "laboratory UMR1 is succeeded by UMR2",
        "laboratory UMR3 is succeeded by UMR2",
      ],
    });
  });

  it.each([
    {
      case: "a successor already in the catalog",
      laboratories: [
        laboratory(),
        laboratory({
          id: "202500002B",
          code: "UMR2",
          acronym: "L2",
          name: "Laboratoire deux",
        }),
      ],
      records: [successor],
      notes: ["laboratory UMR1 is succeeded by UMR2, already listed"],
    },
    {
      case: "no successor",
      laboratories: [laboratory()],
      records: [],
      notes: ["laboratory UMR1 is not in RNSR"],
    },
    {
      case: "a successor whose code is already listed",
      laboratories: [laboratory()],
      records: [{ ...successor, label_numero: ["UMR 1"] }],
      notes: ["laboratory UMR1 is succeeded by UMR1, a code already listed"],
    },
    {
      case: "several successors",
      laboratories: [laboratory()],
      records: [
        successor,
        {
          ...successor,
          numero_national_de_structure: "202500003C",
          label_numero: ["UMR 3"],
        },
      ],
      notes: ["laboratory UMR1 is split into 202500002B, 202500003C in RNSR"],
    },
    {
      case: "a successor without a code",
      laboratories: [laboratory()],
      records: [{ ...successor, label_numero: null }],
      notes: ["laboratory UMR1 is succeeded by 202500002B, without a code"],
    },
  ])(
    "should keep an inactive laboratory unchanged with $case",
    ({ laboratories, records, notes }) => {
      expect(mergeRnsr({ laboratories, osus: [] }, records)).toEqual({
        laboratories,
        osus: [],
        notes,
      });
    },
  );

  it.each([
    {
      case: "an active record under another name and code",
      records: [
        record({ libelle: "Autre laboratoire", label_numero: ["UAR 9"] }),
      ],
    },
    {
      case: "an active successor",
      records: [successor],
    },
  ])(
    "should leave a replaced laboratory untouched despite $case",
    ({ records }) => {
      const replaced = laboratory({ replacedBy: "200812294H" });

      expect(
        mergeRnsr({ laboratories: [replaced], osus: [] }, records),
      ).toEqual({ laboratories: [replaced], osus: [], notes: [] });
    },
  );

  it.each([
    {
      case: "take the RNSR name of an OSU",
      code: "OSU1",
      expected: "Observatoire un renommé",
      notes: ["OSU OSU1 is renamed Observatoire un renommé"],
    },
    {
      case: "keep the curated name of a pinned OSU",
      code: "OMP",
      expected: "Observatoire un",
      notes: [],
    },
  ])("should $case", ({ code, expected, notes }) => {
    expect(
      mergeRnsr({ laboratories: [], osus: [osu({ code })] }, [
        record({
          numero_national_de_structure: "199900009A",
          libelle: "Observatoire un renommé (UAR 9)",
        }),
      ]),
    ).toEqual({
      laboratories: [],
      osus: [osu({ code, name: expected })],
      notes,
    });
  });

  it("should add the organizations of an OSU's laboratories to its own", () => {
    const laboratories = [laboratory({ organizationRors: [SORBONNE] })];

    expect(mergeRnsr({ laboratories, osus: [osu()] }, [record()]).osus).toEqual(
      [osu({ organizationRors: [CNRS, SORBONNE] })],
    );
  });
});
