import type { Messages } from "../create-sample-labels.ts";

import catalog from "../../../messages/en.json";
import { createSampleLabels } from "../create-sample-labels.ts";
import { createMatchingMaterialPaths } from "./matching-material-paths.ts";

const m = Object.fromEntries(
  Object.entries(catalog as Record<string, string>)
    .filter(([key]) => !key.startsWith("$"))
    .map(([key, text]) => [key, () => text]),
) as unknown as Messages;

const matchingMaterialPaths = createMatchingMaterialPaths(
  createSampleLabels(m).materialPathLabel,
);

const GRANITE = "rock_and_sediment.rock.igneous.plutonic.felsic.granite";

describe("createMatchingMaterialPaths", () => {
  it.each([
    ["igneous", "rock_and_sediment.rock.igneous"],
    ["GRANITE", GRANITE],
    ["gran", GRANITE],
    ["gran*", GRANITE],
    ["*ite", GRANITE],
  ])("should include the path whose own label %j matches", (token, path) => {
    expect(matchingMaterialPaths(token)).toContain(path);
  });

  it("should match a meta-prefixed label under a meta branch only", () => {
    const paths = matchingMaterialPaths("meta-granite");

    expect(paths).not.toEqual([]);
    expect(paths.every((path) => path.includes(".meta_igneous_rock."))).toBe(
      true,
    );
  });

  it.each([
    ["rani*", "granite"],
    ["sediment", "rock_and_sediment"],
  ])("should not match %j against %j", (token, excluded) => {
    expect(
      matchingMaterialPaths(token).filter((path) => path.endsWith(excluded)),
    ).toEqual([]);
  });

  it("should return no path for an unknown word", () => {
    expect(matchingMaterialPaths("zzzz")).toEqual([]);
  });

  it("should stay prompt over a broad query's every token", () => {
    const started = performance.now();

    for (let run = 0; run < 100; run++) {
      for (const token of "te ro ne an ar er".split(" ")) {
        matchingMaterialPaths(token);
      }
    }

    expect(performance.now() - started).toBeLessThan(1000);
  });
});
