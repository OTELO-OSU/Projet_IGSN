import { collectionMethodLabel } from "./collection-method-label.ts";

describe("collectionMethodLabel", () => {
  it.each([
    ["blasting", "Blasting"],
    ["coring", "Coring"],
    ["coring.gravity_corer", "GravityCorer"],
    ["coring.gravity_corer.giant", "Giant"],
    ["dredging.chain_bag_dredge", "Chain BagDredge"],
  ] as const)("should return the translated label for %s", (method, label) => {
    expect(collectionMethodLabel(method)).toBe(label);
  });
});
