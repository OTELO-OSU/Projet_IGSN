import { describe, expect, it } from "vitest";

import { datasetDescription, datasetReadme } from "./readme.ts";
import { sampleCsvTables } from "./sample-csv-tables.ts";

describe("datasetReadme", () => {
  const { fileName, content } = datasetReadme("https://igsn.example.org/");

  it("should be a text file, an extension data.gouv.fr accepts", () => {
    expect(fileName).toBe("README.txt");
  });

  it("should document every column of every CSV file", () => {
    const documented = sampleCsvTables([]).flatMap(({ fileName, content }) =>
      content
        .trim()
        .split(",")
        .map((header) => `${fileName} ${header}`),
    );
    const sections = content.split("\n### ").slice(1);

    expect(
      sections.flatMap((section) => {
        const [title = ""] = section.split("\n");
        const file = /`([^`]+)`/.exec(title)?.[1];
        return [...section.matchAll(/^\| `([^`]+)` \|/gm)].map(
          ([, header]) => `${file} ${header}`,
        );
      }),
    ).toEqual(documented);
  });

  it("should point to each sample's page on the public site", () => {
    expect(content).toContain("`https://igsn.example.org/samples/<igsn>`");
  });

  it("should keep the reading conventions in the README, out of the dataset description", () => {
    expect([
      content.includes("RFC 4180"),
      datasetDescription("https://igsn.example.org/").includes("RFC 4180"),
    ]).toEqual([true, false]);
  });

  it("should describe each column by its label", () => {
    expect(content).toContain("| `nature` | Nature |");
    expect(content).toContain(
      "| `internal_number` | Internal number, displayed as sample-N |",
    );
    expect(content).toContain(
      "| `repository_rights_holder_name` | Rights holder name |",
    );
  });
});
