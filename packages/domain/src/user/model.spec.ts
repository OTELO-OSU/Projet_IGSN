import { userSchema } from "./model.ts";

const user = {
  id: "01890a5d-ac96-774b-bcce-b302099a8057",
  email: "marie.curie@univ-lorraine.fr",
  name: "Curie",
  firstname: "Marie",
  orcid: null,
};

describe("userSchema", () => {
  it.each(["curie(at)univ-lorraine.fr", "inconnu", ""])(
    "should accept the legacy-imported address %s",
    (email) => {
      expect(userSchema.safeParse({ ...user, email }).success).toBe(true);
    },
  );
});
