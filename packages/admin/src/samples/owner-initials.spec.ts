import { ownerInitials } from "./owner-initials.ts";

describe("ownerInitials", () => {
  it("should join the firstname and name initials", () => {
    expect(ownerInitials({ firstname: "Marie", name: "Curie" })).toBe("MC");
  });

  it("should uppercase lowercase names", () => {
    expect(ownerInitials({ firstname: "marie", name: "curie" })).toBe("MC");
  });

  it("should use the name alone when the firstname is missing", () => {
    expect(ownerInitials({ firstname: null, name: "Curie" })).toBe("C");
  });

  it("should use the firstname alone when the name is missing", () => {
    expect(ownerInitials({ firstname: "Marie", name: null })).toBe("M");
  });

  it("should return an empty string when both are missing", () => {
    expect(ownerInitials({ firstname: null, name: null })).toBe("");
  });

  it("should ignore blank names", () => {
    expect(ownerInitials({ firstname: "  ", name: "Curie" })).toBe("C");
  });
});
