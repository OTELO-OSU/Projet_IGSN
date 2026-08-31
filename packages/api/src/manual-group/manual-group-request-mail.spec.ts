import { describe, expect, it } from "vitest";

import { manualGroupRequestMail } from "./manual-group-request-mail.ts";

const ADMIN_URL = "http://localhost:3001/admin/";

const CURIE = {
  id: "01890a5d-ac96-774b-bcce-b302099a9001",
  email: "marie.curie@univ-lorraine.fr",
  name: "Curie",
  firstname: "Marie",
};

const DUPONT = {
  id: "01890a5d-ac96-774b-bcce-b302099a9002",
  email: "pierre.dupont@univ-lorraine.fr",
  name: null,
  firstname: null,
};

const request = {
  requester: {
    email: "jean.martin@univ-lorraine.fr",
    name: "Martin",
    firstname: "Jean",
  },
  name: "Massif Central 2026",
  managers: [CURIE, DUPONT],
  adminUrl: ADMIN_URL,
};

const ctaUrl = (name: string) =>
  `http://localhost:3001/admin/manual-groups?requestedName=${name}&requestedManagerIds=${CURIE.id}%2C${DUPONT.id}`;

describe("manualGroupRequestMail", () => {
  it.each([
    ["a named requester", request.requester, "Jean Martin"],
    [
      "a requester with no name",
      { email: "jean.martin@univ-lorraine.fr", name: null, firstname: null },
      "jean.martin@univ-lorraine.fr",
    ],
  ])(
    "should name %s, the group and every requested manager, and link the admin page with both params",
    async (_case, requester, who) => {
      const mail = await manualGroupRequestMail({ ...request, requester });

      expect(mail.subject).toBe(
        `${who} requests the manual group "Massif Central 2026"`,
      );
      expect(mail.text).toBe(
        `Hello,

${who} requests the creation of the manual group "Massif Central 2026", to be managed by Marie Curie (marie.curie@univ-lorraine.fr), pierre.dupont@univ-lorraine.fr.

Create this group: ${ctaUrl("Massif+Central+2026")}
`,
      );
    },
  );
});
