import { laboratoryCodesWithSuccessors } from "./laboratory-codes-with-successors.ts";
import { type Laboratory } from "./laboratory.ts";

const laboratory = (
  code: string,
  overrides: Partial<Laboratory> = {},
): Laboratory => ({
  id: `id-${code}`,
  code,
  acronym: code,
  name: code,
  osu: null,
  organizationRors: ["02feahw73"],
  ...overrides,
});

describe("laboratoryCodesWithSuccessors", () => {
  const catalog = [
    laboratory("UMR1", { formerCodes: ["UPR1"], replacedBy: "id-UMR2" }),
    laboratory("UMR2", { replacedBy: "id-UMR3" }),
    laboratory("UMR3"),
  ];

  it.each(["UMR1", "UPR1"])(
    "should add the current code of every laboratory down the replacement chain of %s",
    (code) => {
      expect(laboratoryCodesWithSuccessors(code, catalog)).toEqual([
        "UMR1",
        "UMR2",
        "UMR3",
      ]);
    },
  );

  it("should return the code alone when it is not replaced", () => {
    expect(laboratoryCodesWithSuccessors("FR636")).toEqual(["FR636"]);
  });
});
