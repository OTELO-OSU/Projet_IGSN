import { describe, expect, it } from "vitest";

import { sampleRemovalMail } from "./sample-removal-mail.ts";

const ADMIN_URL = "http://localhost:3001/admin/";

const removal = {
  removed: {
    email: "marie.dupont@univ-lorraine.fr",
    name: "Dupont",
    firstname: "Marie",
  },
  remover: {
    email: "jean.martin@univ-lorraine.fr",
    name: "Martin",
    firstname: "Jean",
  },
  sampleName: "Basalt core 12",
  url: ADMIN_URL,
};

describe("sampleRemovalMail", () => {
  it("should name the remover and the sample, and link the sample list", async () => {
    const mail = await sampleRemovalMail(removal);

    expect(mail.subject).toBe(
      'Jean Martin removed you from the sample "Basalt core 12"',
    );
    expect(mail.text).toBe(
      `Hello Marie Dupont,

Jean Martin removed you from the sample "Basalt core 12". You can no longer see or edit it.

Open my samples: ${ADMIN_URL}
`,
    );
    expect(mail.html).toContain("Jean Martin");
    expect(mail.html).toContain("Basalt core 12");
    expect(mail.html).toContain(ADMIN_URL);
  });

  it("should fall back to the remover's email when they have no name", async () => {
    const mail = await sampleRemovalMail({
      ...removal,
      remover: {
        email: "jean.martin@univ-lorraine.fr",
        name: null,
        firstname: null,
      },
    });

    expect(mail.subject).toBe(
      'jean.martin@univ-lorraine.fr removed you from the sample "Basalt core 12"',
    );
    expect(mail.text).toContain("jean.martin@univ-lorraine.fr removed you");
  });
});
