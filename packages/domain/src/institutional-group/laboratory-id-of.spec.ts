import { laboratoryIdOf } from "./laboratory-id-of.ts";

describe("laboratoryIdOf", () => {
  it.each([
    { input: "a current code", code: "UAR2074", expected: "199921733G" },
    { input: "a former code", code: "UPS2074", expected: "199921733G" },
    { input: "an unknown value", code: "UMR9999", expected: "UMR9999" },
  ])("should resolve $input to its id", ({ code, expected }) => {
    expect(laboratoryIdOf(code)).toBe(expected);
  });
});
