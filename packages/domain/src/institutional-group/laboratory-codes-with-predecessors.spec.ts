import { laboratoryCodesWithPredecessors } from "./laboratory-codes-with-predecessors.ts";
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

describe("laboratoryCodesWithPredecessors", () => {
  const catalog = [
    laboratory("UMR1", { replacedBy: "id-UMR2" }),
    laboratory("UMR2", { replacedBy: "id-UMR3" }),
    laboratory("UMR3", { formerCodes: ["UPR3"] }),
    laboratory("UMR4", { replacedBy: "id-UMR3" }),
    laboratory("UMR5", { replacedBy: "id-UMR6" }),
    laboratory("UMR6"),
  ];

  it.each(["UMR3", "UPR3"])(
    "should add the current code of every laboratory whose replacement chain ends at %s",
    (code) => {
      expect(laboratoryCodesWithPredecessors(code, catalog).toSorted()).toEqual(
        ["UMR1", "UMR2", "UMR3", "UMR4"],
      );
    },
  );

  it("should return the code alone when it replaced none", () => {
    expect(laboratoryCodesWithPredecessors("FR636")).toEqual(["FR636"]);
  });
});
