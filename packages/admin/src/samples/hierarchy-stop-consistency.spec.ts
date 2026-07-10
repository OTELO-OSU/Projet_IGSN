import { canStopAtPath } from "@projet-igsn/design-system/components/form/hierarchy-select-field";
import {
  COLLECTION_METHOD_HIERARCHY,
  COLLECTION_METHODS,
} from "@projet-igsn/domain/sample/collection-method/vocabulary";
import {
  MATERIAL_HIERARCHY,
  MATERIAL_PATHS,
} from "@projet-igsn/domain/sample/material/classification";
import { isMaterialComplete } from "@projet-igsn/domain/sample/material/is-complete";
import { isSampleTypeComplete } from "@projet-igsn/domain/sample/type/is-complete";
import {
  SAMPLE_TYPE_HIERARCHY,
  SAMPLE_TYPES,
} from "@projet-igsn/domain/sample/type/vocabulary";

// Drift guard: the widget derives its "stop here" options from the tree
// (canStopAtPath) while the publish gate reads the domain predicates. This spec
// pins them together for every path of every vocabulary, so a stop the UI
// offers is always one the domain accepts, and vice versa.
describe("hierarchy stop consistency", () => {
  it.each([
    ["material", MATERIAL_HIERARCHY, MATERIAL_PATHS, isMaterialComplete],
    ["sample type", SAMPLE_TYPE_HIERARCHY, SAMPLE_TYPES, isSampleTypeComplete],
    [
      "collection method",
      COLLECTION_METHOD_HIERARCHY,
      COLLECTION_METHODS,
      // Every collection-method node is a valid stop (no completeness gate).
      () => true,
    ],
  ] as const)(
    "should offer %s stops exactly where the domain deems the path complete",
    (_vocabulary, hierarchy, paths, isComplete) => {
      const widgetStops = Object.fromEntries(
        paths.map((path) => [path, canStopAtPath(hierarchy, path)]),
      );
      const domainVerdicts = Object.fromEntries(
        paths.map((path) => [path, isComplete(path)]),
      );
      expect(widgetStops).toEqual(domainVerdicts);
    },
  );
});
