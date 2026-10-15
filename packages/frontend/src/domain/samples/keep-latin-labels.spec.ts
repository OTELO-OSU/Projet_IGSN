import type { StyleSpecification } from "maplibre-gl";

import { keepLatinLabels } from "#/domain/samples/keep-latin-labels.ts";

const LATIN_FALLBACK = ["coalesce", ["get", "name_en"], ["get", "name"]];
const ROAD_REF = ["to-string", ["get", "ref"]];

function styleWithLabels(labels: readonly unknown[]): StyleSpecification {
  return {
    version: 8,
    sources: {},
    layers: labels.map((textField, index) => ({
      id: `label-${index}`,
      type: "symbol",
      source: "openmaptiles",
      layout: { "text-field": textField },
    })),
  } as StyleSpecification;
}

describe("keepLatinLabels", () => {
  it("should label a place with its Latin name alone, keeping the other label rules", () => {
    const style = styleWithLabels([
      [
        "case",
        ["has", "name:nonlatin"],
        ["concat", ["get", "name:latin"], "\n", ["get", "name:nonlatin"]],
        LATIN_FALLBACK,
      ],
      ROAD_REF,
    ]);

    expect(keepLatinLabels(style)).toEqual(
      styleWithLabels([
        [
          "case",
          ["has", "name:nonlatin"],
          ["get", "name:latin"],
          LATIN_FALLBACK,
        ],
        ROAD_REF,
      ]),
    );
  });
});
