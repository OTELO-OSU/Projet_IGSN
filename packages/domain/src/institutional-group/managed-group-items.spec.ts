import { MANAGED_LABORATORY_ITEMS } from "./managed-group-items.ts";

describe("MANAGED_LABORATORY_ITEMS", () => {
  it("should offer the replacing laboratory but not the one it replaced", () => {
    const offered = MANAGED_LABORATORY_ITEMS.map(({ value }) => value);

    expect(offered).toContain("UMR8254");
    expect(offered).not.toContain("UMR8109");
  });
});
