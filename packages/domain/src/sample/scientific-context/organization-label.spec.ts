import { organizationLabel } from "./organization-label.ts";

describe("organizationLabel", () => {
  it("should render name with acronym when the ROR is known and has one", () => {
    expect(organizationLabel("03fd77x13")).toBe(
      "Institut national de physique nucléaire et de physique des particules (CNRS - IN2P3)",
    );
  });

  it("should render the bare name when the known organization has no acronym", () => {
    expect(organizationLabel("043htjv09")).toBe("CY Cergy Paris Université");
  });

  it("should fall back to the raw ROR when the organization is unknown", () => {
    expect(organizationLabel("000000000")).toBe("000000000");
  });
});
