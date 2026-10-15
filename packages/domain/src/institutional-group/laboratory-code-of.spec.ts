import { laboratoryCodeOf } from "./laboratory-code-of.ts";

describe("laboratoryCodeOf", () => {
  it.each([
    {
      input: "the id of a renumbered laboratory",
      id: "199921733G",
      expected: "UAR2074",
    },
    { input: "an unknown value", id: "UMR9999", expected: "UMR9999" },
  ])("should resolve $input to its current code", ({ id, expected }) => {
    expect(laboratoryCodeOf(id)).toBe(expected);
  });
});
