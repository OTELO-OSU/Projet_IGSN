import { describe, expect, it } from "vitest";

import { subSampleDeclaredMail } from "./sub-sample-declared-mail.ts";

const SUB_SAMPLE_URL =
  "http://localhost:3001/admin/samples/01890a5d-ac96-774b-bcce-b302099a9004";

const declaration = {
  owner: {
    email: "marie.dupont@univ-lorraine.fr",
    name: "Dupont",
    firstname: "Marie",
  },
  declarer: {
    email: "jean.martin@univ-lorraine.fr",
    name: "Martin",
    firstname: "Jean",
  },
  subSampleName: "Lame mince A12",
  parentNames: ["Basalte du Puy"],
  subSampleUrl: SUB_SAMPLE_URL,
};

describe("subSampleDeclaredMail", () => {
  it.each([
    ["a named declarer", declaration.declarer, "Jean Martin"],
    [
      "a declarer with no name",
      { email: "jean.martin@univ-lorraine.fr", name: null, firstname: null },
      "jean.martin@univ-lorraine.fr",
    ],
  ])(
    "should name %s, the sub-sample and the parent, and link the sub-sample",
    async (_case, declarer, sender) => {
      const mail = await subSampleDeclaredMail({ ...declaration, declarer });

      expect(mail.subject).toBe(
        `${sender} declared a sub-sample of your sample "Basalte du Puy"`,
      );
      expect(mail.text).toBe(
        `Hello Marie Dupont,

${sender} declared the sub-sample "Lame mince A12" from your sample "Basalte du Puy". You are a contributor on it.

Open the sub-sample: ${SUB_SAMPLE_URL}
`,
      );
    },
  );

  it("should list every parent in one mail when the owner owns several", async () => {
    const mail = await subSampleDeclaredMail({
      ...declaration,
      parentNames: ["Basalte du Puy", "Granite des Vosges"],
    });

    expect(mail.subject).toBe(
      "Jean Martin declared a sub-sample of 2 of your samples",
    );
    expect(mail.text).toBe(
      `Hello Marie Dupont,

Jean Martin declared the sub-sample "Lame mince A12" from your samples "Basalte du Puy", "Granite des Vosges". You are a contributor on it.

Open the sub-sample: ${SUB_SAMPLE_URL}
`,
    );
  });
});
