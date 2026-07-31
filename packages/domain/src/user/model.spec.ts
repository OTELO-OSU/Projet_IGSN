import { userSchema } from "./model.ts";

const user = {
  id: "01890a5d-ac96-774b-bcce-b302099a8057",
  email: "marie.curie@univ-lorraine.fr",
  name: "Curie",
  firstname: "Marie",
};

describe("userSchema", () => {
  it("should accept a user", () => {
    expect(userSchema.parse(user)).toEqual(user);
  });

  it("should accept a null name and firstname", () => {
    expect(userSchema.parse({ ...user, name: null, firstname: null })).toEqual({
      ...user,
      name: null,
      firstname: null,
    });
  });

  it.each(["curie(at)univ-lorraine.fr", "inconnu", ""])(
    "should accept the legacy-imported address %s",
    (email) => {
      expect(userSchema.safeParse({ ...user, email }).success).toBe(true);
    },
  );

  it.each([
    { ...user, id: "not-a-uuid" },
    { ...user, email: undefined },
    { ...user, name: 42 },
  ])("should reject %s", (input) => {
    expect(userSchema.safeParse(input).success).toBe(false);
  });
});
