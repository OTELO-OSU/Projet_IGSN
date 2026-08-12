import { filterOrganizationsWithLaboratory } from "./filter-organizations-with-laboratory.ts";

const ORLEANS = "014zrew76";
const INSU = "04kdfz702";

describe("filterOrganizationsWithLaboratory", () => {
  it("should not offer an organization without a laboratory", () => {
    const offered = filterOrganizationsWithLaboratory().map(
      (organization) => organization.ror,
    );

    expect(offered).toContain(ORLEANS);
    expect(offered).not.toContain(INSU);
  });
});
