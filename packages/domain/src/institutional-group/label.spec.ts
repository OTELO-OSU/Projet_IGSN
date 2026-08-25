import {
  laboratoryShortLabel,
  organizationLabel,
  organizationShortLabel,
} from "./label.ts";
import { LABORATORIES } from "./laboratory.ts";
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

describe("organizationShortLabel", () => {
  it("should render the acronym when the organization has one", () => {
    expect(organizationShortLabel(withAcronym!.ror)).toBe(withAcronym!.acronym);
  });

  it("should fall back to the name when the organization has no acronym", () => {
    expect(organizationShortLabel(withoutAcronym!.ror)).toBe(
      withoutAcronym!.name,
    );
  });

  it("should fall back to the raw ROR when the organization is unknown", () => {
    expect(organizationShortLabel("000000000")).toBe("000000000");
  });
});

describe("laboratoryShortLabel", () => {
  it("should render the acronym of a known laboratory", () => {
    const laboratory = LABORATORIES[0]!;
    expect(laboratoryShortLabel(laboratory.code)).toBe(laboratory.acronym);
  });

  it("should fall back to the raw code when the laboratory is unknown", () => {
    expect(laboratoryShortLabel("UMR0000")).toBe("UMR0000");
  });
});
