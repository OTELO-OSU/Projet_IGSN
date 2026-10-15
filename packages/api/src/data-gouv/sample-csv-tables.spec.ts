import type { Sample } from "@projet-igsn/domain/sample/sample";

import { organizationLabel } from "@projet-igsn/domain/institutional-group/label";
import { RESEARCH_PROJECT_SAMPLE } from "@projet-igsn/domain/sample/core/core-sample-fixture";
import { describe, expect, it } from "vitest";

import { sampleCsvTables } from "./sample-csv-tables.ts";

const IGSN = "10.58052/IEABC0001";

const SAMPLE: Sample = { ...RESEARCH_PROJECT_SAMPLE, igsn: IGSN };

const EMPTY_SAMPLE = {
  ...Object.fromEntries(
    Object.entries(SAMPLE).map(([key, value]) => [
      key,
      Array.isArray(value) ? [] : null,
    ]),
  ),
  id: SAMPLE.id,
  name: "Bare sample",
  igsn: IGSN,
  status: "published",
} as Sample;

const parseCsv = (csv: string): string[][] => {
  const rows: string[][] = [[]];
  for (const [, cell = "", end] of csv.matchAll(
    /("(?:[^"]|"")*"|[^",\r\n]*)(,|\r\n)/g,
  )) {
    rows
      .at(-1)!
      .push(
        cell.startsWith('"') ? cell.slice(1, -1).replaceAll('""', '"') : cell,
      );
    if (end === "\r\n") rows.push([]);
  }
  return rows.slice(0, -1);
};

const tablesOf = (samples: readonly Sample[]) =>
  Object.fromEntries(
    sampleCsvTables(samples).map(({ fileName, content }) => [
      fileName,
      parseCsv(content),
    ]),
  );

const headersOf = (samples: readonly Sample[]) =>
  Object.entries(tablesOf(samples)).map(([fileName, [header]]) => ({
    fileName,
    header,
  }));

const sampleRecordOf = (sample: Sample) => {
  const [header = [], row = []] = tablesOf([sample])["samples.csv"]!;
  return Object.fromEntries(header.map((path, index) => [path, row[index]]));
};

const samplesCsvOf = (sample: Sample) =>
  sampleCsvTables([sample]).find(({ fileName }) => fileName === "samples.csv")!
    .content;

describe("sampleCsvTables", () => {
  it("should write one header-only table per sheet but attachments when no sample is published", () => {
    expect(
      Object.entries(tablesOf([])).map(([fileName, rows]) => ({
        fileName,
        rows: rows.length,
      })),
    ).toEqual(
      [
        "samples.csv",
        "relations.csv",
        "additional-roles.csv",
        "funder-organizations.csv",
        "host-institutions.csv",
        "rights-holders.csv",
        "elements-of-interest.csv",
        "storage-conditions.csv",
        "process-steps.csv",
        "vertical-positions.csv",
      ].map((fileName) => ({ fileName, rows: 1 })),
    );
  });

  it.each([
    { label: "a filled sample", sample: SAMPLE },
    { label: "a sample with every optional field empty", sample: EMPTY_SAMPLE },
  ])("should keep the header rows stable with $label", ({ sample }) => {
    expect(headersOf([sample])).toEqual(headersOf([]));
  });

  it("should leave every cell of an empty sample empty but its name and igsn", () => {
    expect(sampleRecordOf(EMPTY_SAMPLE)).toEqual(
      Object.fromEntries(
        Object.keys(sampleRecordOf(SAMPLE)).map((path) => [
          path,
          { name: "Bare sample", igsn: IGSN }[path] ?? "",
        ]),
      ),
    );
  });

  it("should drop the manual groups, archive contact email and local ID columns", () => {
    expect(Object.keys(sampleRecordOf(SAMPLE))).toEqual(
      expect.not.arrayContaining([
        "manual_group_ids",
        "repository_current_archive_contact_email",
        "local_id",
        "local_id_description",
      ]),
    );
  });

  it("should write stored codes under snake_case headers, one dot-path per hierarchy", () => {
    expect(sampleRecordOf(SAMPLE)).toMatchObject({
      igsn: IGSN,
      nature: "hand_sample",
      material: "rock_and_sediment.rock.igneous.plutonic.felsic.granite",
      collection_method: "coring.box_corer",
      location_region: "country.FR",
      description_collection_date_start: "2024-06-01T08:30",
      description_oriented: "true",
      description_length_value: "12",
      condition_packaging: "cardboard_box",
    });
  });

  it("should lead the samples table with the igsn, then the stored internal number", () => {
    const [header = [], row = []] = tablesOf([
      { ...SAMPLE, internalNumber: 42 },
    ])["samples.csv"]!;

    expect([header.slice(0, 2), row.slice(0, 2)]).toEqual([
      ["igsn", "internal_number"],
      [IGSN, "42"],
    ]);
  });

  it("should keep an acronym whole in a snake_case header", () => {
    expect(tablesOf([])["relations.csv"]![0]).toContain("relations_scheme_uri");
  });

  it("should name the current archive's OSU and laboratory beside their codes", () => {
    expect(sampleRecordOf(SAMPLE)).toMatchObject({
      repository_current_archive_osu: "OASU",
      repository_current_archive_osu_name:
        "Observatoire aquitain des sciences de l'univers (OASU)",
      repository_current_archive_laboratory: "UMR5805",
      repository_current_archive_laboratory_name:
        "Environnements et paléoenvironnements océaniques et continentaux (EPOC)",
    });
  });

  it("should key child rows by the sample igsn, naming each organization beside its ROR", () => {
    expect(tablesOf([SAMPLE])["rights-holders.csv"]).toEqual([
      ["igsn", "repository_rights_holder", "repository_rights_holder_name"],
      [IGSN, "03fd77x13", organizationLabel("03fd77x13")],
      [IGSN, "02cte4b68", organizationLabel("02cte4b68")],
    ]);
  });

  it("should write each vertical position of a sample as its own row", () => {
    const sample: Sample = {
      ...SAMPLE,
      location: {
        ...SAMPLE.location!,
        verticalPositions: [
          { reference: "bathymetry", system: "msl", start: 3200, end: 3200 },
          {
            reference: "depth_below_sea_floor",
            system: null,
            start: 2.1,
            end: 2.35,
          },
        ],
      },
    };

    expect(tablesOf([sample])["vertical-positions.csv"]).toEqual([
      [
        "igsn",
        "location_vertical_positions_reference",
        "location_vertical_positions_system",
        "location_vertical_positions_start",
        "location_vertical_positions_end",
      ],
      [IGSN, "bathymetry", "msl", "3200", "3200"],
      [IGSN, "depth_below_sea_floor", "", "2.1", "2.35"],
    ]);
  });

  it("should join a sub-sample's two parents with a pipe", () => {
    const parent = { name: "Parent", material: null };
    const sample: Sample = {
      ...SAMPLE,
      parents: [
        { ...parent, id: "33333333-3333-4333-8333-333333333333", igsn: "A1" },
        { ...parent, id: "44444444-4444-4444-8444-444444444444", igsn: "B2" },
      ],
    };

    expect(sampleRecordOf(sample).parents_igsn).toBe("A1|B2");
  });

  it.each(['say "hi"', "a, b", "line\nbreak", "line\r\nbreak"])(
    "should round-trip %j through a CSV parse",
    (specificName) => {
      expect(sampleRecordOf({ ...SAMPLE, specificName }).specific_name).toBe(
        specificName,
      );
    },
  );

  it.each(["=1+1", "+1", "-foo", "@SUM(A1)", "\tx", "\rx"])(
    "should prefix the text cell %j with a quote",
    (specificName) => {
      expect(sampleRecordOf({ ...SAMPLE, specificName }).specific_name).toBe(
        `'${specificName}`,
      );
    },
  );

  it("should write a negative number bare", () => {
    const sample: Sample = {
      ...SAMPLE,
      location: {
        ...SAMPLE.location!,
        position: { type: "point", longitude: -3, latitude: 48.69 },
      },
    };

    expect(samplesCsvOf(sample)).toContain(",-3,48.69,");
  });
});
