import { organizationLabel } from "./label.ts";
import { ORGANIZATIONS } from "./organization.ts";

const withAcronym = ORGANIZATIONS.find(
  (organization) => organization.acronym !== null,
);
const withoutAcronym = ORGANIZATIONS.find(
  (organization) => organization.acronym === null,
);

describe("organizationLabel", () => {
  it("should render name with acronym when the ROR is known and has one", () => {
    expect(organizationLabel(withAcronym!.ror)).toBe(
      `${withAcronym!.name} (${withAcronym!.acronym})`,
    );
  });

  it("should render the bare name when the known organization has no acronym", () => {
    expect(organizationLabel(withoutAcronym!.ror)).toBe(withoutAcronym!.name);
  });

  it("should fall back to the raw ROR when the organization is unknown", () => {
    expect(organizationLabel("000000000")).toBe("000000000");
  });
});
